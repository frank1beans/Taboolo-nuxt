# 24 - Price Analysis Pipeline: stima prezzo equo, outlier detection

Obiettivo: capire il sistema di analisi prezzi che stima il "prezzo equo" per ogni voce di listino e identifica gli outlier. Il modulo usa embedding similarity per trovare voci simili e statistiche robuste per la stima.

Il modulo è pensato per:

- **stimare prezzi ragionevoli**: usando mediana pesata dei vicini simili
- **rilevare anomalie**: con MAD (Median Absolute Deviation) robusto
- **funzionare cross-progetto**: analisi globale su più preventivi

## 24.1 - Dove sta

File: `services/importer/analytics/price_analysis.py`

Classi principali:

- `PriceAnalyzer`: analisi singolo progetto
- `GlobalPriceAnalyzer`: analisi multi-progetto

Dipendenze:

- `numpy`, `pymongo`, `bson`

## 24.2 - Concetto: prezzo equo vs outlier

Per ogni voce di listino:

```
Voce target: "Parete cartongesso doppia lastra" → €45.00/mq
                         ↓
            Trova voci SIMILI (embedding)
                         ↓
            Calcola STIMA da voci simili
                         ↓
            Stima: €38.50/mq (mediana pesata)
                         ↓
            Delta: (45 - 38.5) / 38.5 = +16.9%
                         ↓
            Verifica soglia MAD → OUTLIER se > 2σ
```

## 24.3 - Parametri di analisi

File: dataclass `AnalysisParams`

| Parametro | Default | Descrizione |
|-----------|---------|-------------|
| `top_k` | 30 | Numero massimo vicini da considerare |
| `min_similarity` | 0.55 | Soglia minima similarity per essere "vicino" |
| `mad_threshold` | 2.0 | Multiplo MAD per outlier detection |
| `min_category_size` | 3 | Minimo item per analizzare categoria |
| `estimation_method` | "weighted_median" | Metodo stima (o "trimmed_mean") |
| `trimmed_percent` | 0.1 | Percentuale taglio per trimmed_mean |
| `wbs6_filter` | None | Filtra su singola categoria WBS6 |
| `include_neighbors` | True | Include top 5 vicini nell'output |

## 24.4 - Funzioni matematiche core

### Weighted Median

```python
def weighted_median(values: List[float], weights: List[float]) -> float
```

Più robusta della media pesata. I pesi sono le similarity scores dei vicini.

Funzionamento:
1. Ordina valori per dimensione
2. Normalizza pesi
3. Trova il punto dove la somma cumulativa supera 0.5
4. Quel valore è la mediana pesata

### Trimmed Mean

```python
def trimmed_mean(values: List[float], trim_pct: float = 0.1) -> float
```

Media dopo aver rimosso estremi (10% sopra e sotto di default).

### Median Absolute Deviation (MAD)

```python
def median_absolute_deviation(values: List[float]) -> float
```

MAD = median(|x_i - median(x)|)

Misura robusta di dispersione, resistente agli outlier.

## 24.5 - Pipeline di analisi item

Per ogni item:

### Step 1: Find Similar Items

```python
def find_similar_items(
    self,
    target: Dict,
    candidates: List[Dict],
    params: AnalysisParams
) -> List[Dict]
```

- Calcola cosine similarity dell'embedding target vs tutti i candidati
- Filtra per `min_similarity`
- Ordina per similarity decrescente
- Prende top `top_k`

Output per ogni vicino:
```python
{
    "item_id": "...",
    "code": "VP.01.002",
    "description": "Parete cartongesso...",
    "price": 42.50,
    "unit": "mq",
    "similarity": 0.89
}
```

### Step 2: Estimate Fair Price

```python
def estimate_fair_price(
    self,
    neighbors: List[Dict],
    params: AnalysisParams
) -> Tuple[Optional[float], Optional[Tuple[float, float]]]
```

Ritorna:
- `estimated_price`: mediana pesata (o trimmed mean)
- `confidence_band`: tuple (P25, P75) per intervallo

### Step 3: Detect Outlier

```python
def detect_outlier(
    self,
    actual_price: float,
    estimated_price: float,
    category_stats: CategoryStats,
    params: AnalysisParams
) -> Tuple[bool, Optional[str], Optional[str]]
```

Usa z-score robusto basato su MAD:

```
z_robust = |actual - estimated| / (1.4826 * MAD)
```

Il fattore 1.4826 rende MAD comparabile alla deviazione standard per distribuzioni normali.

Severità:
- `low`: z_robust > threshold (es. 2.0)
- `medium`: z_robust > threshold * 1.5 (es. 3.0)
- `high`: z_robust > threshold * 2 (es. 4.0)

## 24.6 - Strutture dati output

### ItemAnalysis

```python
@dataclass
class ItemAnalysis:
    item_id: str
    code: str
    description: str
    unit: str
    actual_price: float
    estimated_price: Optional[float]
    confidence_band: Optional[Tuple[float, float]]  # (P25, P75)
    delta: Optional[float]  # (actual - estimated) / estimated
    neighbors_count: int
    avg_similarity: float
    is_outlier: bool
    outlier_severity: Optional[str]  # "low", "medium", "high"
    outlier_reason: Optional[str]
    top_neighbors: List[Dict]
```

### CategoryAnalysis

```python
@dataclass
class CategoryAnalysis:
    wbs6_code: str
    wbs6_description: str
    item_count: int
    items: List[ItemAnalysis]
    stats: Optional[CategoryStats]  # mean, median, std, min, max, mad
    outlier_count: int
```

### PriceAnalysisResult

```python
@dataclass
class PriceAnalysisResult:
    project_id: str
    total_items: int
    categories_analyzed: int
    outliers_found: int
    categories: List[CategoryAnalysis]
    computed_at: str
    params_used: Optional[Dict]
```

## 24.7 - Analisi per categoria WBS6

L'analisi raggruppa item per WBS6 perché:

- **Confronti sensati**: pareti vs pareti, non pareti vs impianti
- **Statistiche stabili**: MAD calcolato su item omogenei
- **Soglie adattive**: ogni categoria ha i suoi threshold

```python
def analyze_category(
    self,
    wbs6_id: str,
    wbs6_info: Dict,
    items: List[Dict],
    params: AnalysisParams
) -> CategoryAnalysis
```

Flusso:
1. Calcola statistiche categoria (mean, median, MAD...)
2. Per ogni item: trova vicini, stima prezzo, rileva outlier
3. Conta outlier della categoria

## 24.8 - Pipeline completa: analyze_project

```python
def analyze_project(
    self,
    project_id: str,
    params: Optional[AnalysisParams] = None
) -> PriceAnalysisResult
```

Esempio:

```python
from analytics.price_analysis import PriceAnalyzer, AnalysisParams

analyzer = PriceAnalyzer()

params = AnalysisParams(
    top_k=30,
    min_similarity=0.6,
    mad_threshold=2.5,
)

result = analyzer.analyze_project("507f1f77bcf86cd799439011", params)

print(f"Analizzate {result.categories_analyzed} categorie")
print(f"Trovati {result.outliers_found} outlier")

for cat in result.categories:
    print(f"\n{cat.wbs6_description}:")
    for item in cat.items:
        if item.is_outlier:
            print(f"  ⚠️ {item.code}: €{item.actual_price} vs stima €{item.estimated_price}")

analyzer.close()
```

## 24.9 - GlobalPriceAnalyzer: analisi multi-progetto

Estende `PriceAnalyzer` per analisi cross-progetto.

### Casi d'uso

- Confronto prezzi tra preventivi diversi
- Benchmark di settore
- Rilevamento trend temporali

### Metodi aggiuntivi

| Metodo | Scopo |
|--------|-------|
| `fetch_projects(project_ids, year, business_unit)` | Filtra progetti |
| `fetch_items_multi_project(project_ids)` | Item da più progetti |
| `fetch_wbs6_multi_project(project_ids)` | WBS6 normalizzati per codice |

### Normalizzazione WBS6 cross-progetto

Progetti diversi hanno WBS6 con ID diversi ma stesso CODICE. La GlobalPriceAnalyzer raggruppa per codice:

```python
# Input: 2 progetti con WBS6 diverse ma stesso codice
# Progetto A: WBS6 "VP.01" -> _id: "abc123"
# Progetto B: WBS6 "VP.01" -> _id: "xyz789"

# Output: mapping per codice
{
    "VP.01": {
        "code": "VP.01",
        "description": "Pareti verticali",
        "node_ids": ["abc123", "xyz789"]
    }
}
```

## 24.10 - API Integration

La pipeline è esposta via:

- `POST /api/analytics/global-price-analysis`

Body:
```json
{
    "project_ids": ["...", "..."],
    "params": {
        "top_k": 30,
        "min_similarity": 0.6,
        "mad_threshold": 2.0
    }
}
```

Response:
```json
{
    "project_ids": ["..."],
    "total_items": 1234,
    "categories_analyzed": 45,
    "outliers_found": 23,
    "categories": [
        {
            "wbs6_code": "VP.01",
            "wbs6_description": "Pareti verticali",
            "item_count": 89,
            "outlier_count": 5,
            "stats": {...},
            "items": [...]
        }
    ]
}
```

## 24.11 - Interpretazione risultati

### Delta positivo alto

```
actual: €50.00, estimated: €35.00, delta: +42.9%
```

**Possibili cause**:
- Prezzo effettivamente alto (marca premium, materiale speciale)
- Errore di inserimento
- Include lavorazioni aggiuntive non indicate

### Delta negativo alto

```
actual: €25.00, estimated: €38.00, delta: -34.2%
```

**Possibili cause**:
- Prezzo scontato (volume, accordo quadro)
- Errore di inserimento
- Omissione di lavorazioni

### Pochi vicini trovati

```
neighbors_count: 2, avg_similarity: 0.58
```

**Significato**: Item molto specifico o unico nel dataset. La stima potrebbe essere poco affidabile.

## 24.12 - Parametri consigliati per scenario

| Scenario | top_k | min_similarity | mad_threshold |
|----------|-------|----------------|---------------|
| Screening veloce | 20 | 0.50 | 2.5 |
| Analisi standard | 30 | 0.55 | 2.0 |
| Analisi approfondita | 50 | 0.60 | 1.5 |
| Cross-progetto | 50 | 0.50 | 2.0 |

## 24.13 - Debug e troubleshooting

### Nessun outlier trovato

Cause:
1. **MAD troppo alto**: abbassa `mad_threshold`
2. **Prezzi molto uniformi**: normale se il listino è coerente
3. **Pochi vicini**: abbassa `min_similarity`

### Troppi outlier

Cause:
1. **MAD troppo basso**: alza `mad_threshold`
2. **Categorie eterogenee**: filtra per WBS6 specifici
3. **Dati sporchi**: alcuni item hanno prezzi errati

### Stima sempre uguale alla media

Causa: `estimation_method="trimmed_mean"` con `trimmed_percent=0`

Soluzione: usa `weighted_median` o aumenta `trimmed_percent`

### Query lente

Causa: embedding non indicizzato

Soluzione: crea indice MongoDB:
```javascript
db.pricelistitems.createIndex({ "project_id": 1, "embedding": 1 })
```


