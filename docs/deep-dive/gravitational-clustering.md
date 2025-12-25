# 23 - Gravitational Clustering: algoritmo, parametri, debug

Obiettivo: capire l'algoritmo di clustering "gravitazionale" usato per analizzare le voci di listino. A differenza di un clustering "cieco", questo approccio usa le categorie WBS6 come "poli attrattori" che influenzano la formazione dei cluster.

Il modulo è pensato per:

- **sfruttare la tassonomia esistente**: WBS6 fornisce "centri di gravità" semantici
- **essere robusto**: prototipi calcolati con mediana, non media
- **essere interpretabile**: ogni cluster ha keyword e esempi centrali

## 23.1 - Dove sta

File: `services/importer/logic/gravitational_clustering.py`

Classe principale: `GravitationalClustering`

Dipendenze:

- `numpy`, `pandas`, `sklearn`
- `hdbscan` (opzionale, fallback a sklearn HDBSCAN o Agglomerative)

## 23.2 - Concetto: il modello gravitazionale

Immagina le categorie WBS6 come pianeti che esercitano attrazione gravitazionale sulle voci di listino:

```
        [WBS6: Pareti cartongesso]
              ▲
             /|\
            / | \
           /  |  \
      item1  item2  item3   ← attratti verso il "polo"
         \    |    /
          \   |   /
           \  |  /
            \ | /
             \|/
        [WBS6: Controsoffitti]
```

Se un item è fortemente attratto da un polo (alta similarity), entra nel suo "bacino". Se l'attrazione è troppo debole o ambigua (due poli simili), diventa noise.

### Le 4 fasi

| Fase | Nome | Scopo |
|------|------|-------|
| 1 | **Build Prototypes** | Calcola centroide robusto per ogni WBS6 |
| 2 | **Attraction Scores** | Misura similarity di ogni item verso ogni polo |
| 3 | **Assign Basins** | Decide a quale bacino appartiene ogni item |
| 4 | **Cluster Within** | HDBSCAN all'interno di ogni bacino |

## 23.3 - Fase 1: Build Prototypes

```python
def build_prototypes(
    self,
    df: pd.DataFrame,
    embedding_col: str = "embedding",
    wbs_col: str = "wbs6",
) -> Dict[str, np.ndarray]
```

Per ogni categoria WBS6:

1. Estrai tutti gli embedding degli item appartenenti
2. Normalizza L2
3. Calcola il prototipo (centroide robusto)

### Metodi di calcolo prototipo

| Metodo | Formula | Quando usarlo |
|--------|---------|---------------|
| `median` | `np.median(embeddings, axis=0)` | Default, robusto agli outlier |
| `trimmed_mean` | Media dopo aver tagliato estremi | Gruppi con outlier estremi |
| `mean` | Media semplice | Gruppi molto omogenei |

Esempio configurazione:

```python
gc = GravitationalClustering(
    prototype_method="median",
    trim_fraction=0.1,  # per trimmed_mean: taglia 10% sopra/sotto
)
```

## 23.4 - Fase 2: Attraction Scores

```python
def attraction_scores(
    self,
    df: pd.DataFrame,
    embedding_col: str = "embedding",
    id_col: str = "id",
    top_k: int = 2,
    return_matrix: bool = False,
) -> Tuple[pd.DataFrame, Optional[np.ndarray], np.ndarray]
```

Calcola la similarità coseno di ogni item verso ogni prototipo.

Output DataFrame:

| Colonna | Descrizione |
|---------|-------------|
| `id` | ID dell'item |
| `best_wbs6` | Polo più attraente |
| `best_score` | Score verso il polo migliore |
| `second_wbs6` | Secondo polo |
| `second_score` | Score verso il secondo |

### Perché tenere anche il secondo?

Il margine `(best_score - second_score)` indica quanto l'attribuzione è "sicura":

- **Alto margine** (es. 0.3): item chiaramente in un bacino
- **Basso margine** (es. 0.02): item ambiguo, potrebbe essere noise

## 23.5 - Fase 3: Assign Basins

```python
def assign_basins(
    self,
    df: pd.DataFrame,
    attraction_df: pd.DataFrame,
    wbs_col: str = "wbs6",
    embedding_col: str = "embedding",
    id_col: str = "id",
    margin: float = 0.0,
    threshold_fallback: float = 0.5,
    min_points_for_threshold: int = 5,
) -> pd.DataFrame
```

Decide se un item entra in un bacino o diventa noise.

### Threshold adattivo

Per ogni WBS6, calcola una soglia basata sui suoi item "nativi":

```
threshold[wbs6] = percentile(score_to_own, adaptive_percentile)
```

Dove `score_to_own` è la similarity di ogni item verso il proprio prototipo originale.

Se `adaptive_percentile = 5`, la soglia è il 5° percentile. Questo significa:
- "Accetto solo item con attraction almeno pari al 95% degli item nativi più attratti"

### Regola di membership

```python
ok_threshold = best_score >= threshold[best_wbs6]
ok_margin = (best_score - second_score) >= margin
assigned = best_wbs6 if (ok_threshold and ok_margin) else None
```

### Output DataFrame

Aggiunge colonne:

| Colonna | Descrizione |
|---------|-------------|
| `target_basin` | Polo più attraente |
| `attraction_score` | Score verso target |
| `second_score` | Score verso secondo polo |
| `score_to_own` | Score verso prototipo originale |
| `assigned_basin` | Bacino assegnato (o None = noise) |
| `is_basin_noise` | True se non assegnato |

## 23.6 - Fase 4: Cluster Within Basin

```python
def cluster_within_basin(
    self,
    df_basin: pd.DataFrame,
    embedding_col: str = "embedding",
    min_cluster_size: Optional[int] = None,
    min_samples: Optional[int] = None,
    distance_threshold: float = 0.3,
) -> Tuple[np.ndarray, np.ndarray]
```

All'interno di ogni bacino, applica HDBSCAN per trovare sub-cluster.

### Perché HDBSCAN?

- **Trova cluster di densità variabile**: un bacino può avere sotto-gruppi densi e sparse
- **Identifica noise**: item isolati non vengono forzati in cluster
- **Nessun numero di cluster pre-definito**: scopre automaticamente la struttura

### Fallback

Se HDBSCAN non è disponibile o fallisce:

1. Prova sklearn HDBSCAN
2. Fallback a AgglomerativeClustering con `distance_threshold`

### Parametri

| Parametro | Default | Descrizione |
|-----------|---------|-------------|
| `min_cluster_size` | `max(5, 5% del bacino)` | Dimensione minima cluster |
| `min_samples` | `50% di min_cluster_size` | Densità minima |
| `distance_threshold` | 0.3 | Per AgglomerativeClustering fallback |

## 23.7 - Pipeline completa: fit_predict

```python
def fit_predict(
    self,
    df: pd.DataFrame,
    embedding_col: str = "embedding",
    wbs_col: str = "wbs6",
    id_col: str = "id",
    text_col: str = "description",
    margin: float = 0.0,
    top_k: int = 2,
    hdb_min_cluster_size: Optional[int] = None,
    hdb_min_samples: Optional[int] = None,
    agg_distance_threshold: float = 0.3,
    tfidf_stop_words=None,
    strict_basins: bool = False,
    skip_prototype_build: bool = False,
) -> Tuple[pd.DataFrame, Dict[str, Any]]
```

Esegue tutte le fasi e ritorna:

1. **df_out**: DataFrame originale + colonne clustering
2. **cluster_reports**: spiegazioni per ogni cluster

### Colonne aggiunte

| Colonna | Esempio | Descrizione |
|---------|---------|-------------|
| `target_basin` | "Pareti cartongesso" | Polo più attraente |
| `attraction_score` | 0.85 | Similarity verso polo |
| `assigned_basin` | "Pareti cartongesso" | Bacino finale (o None) |
| `is_basin_noise` | False | True se non assegnato |
| `cluster_id` | "Pareti cartongesso::2" | ID cluster finale |
| `cluster_prob` | 0.95 | Probabilità membership (HDBSCAN) |

### Formato cluster_id

```
{basin_name}::{cluster_number}
```

Esempi:

- `"Pareti cartongesso::0"` → primo cluster nel bacino Pareti cartongesso
- `"Controsoffitti::NOISE"` → noise nel bacino Controsoffitti

## 23.8 - Explain Clusters

```python
def explain_clusters(
    self,
    df: pd.DataFrame,
    cluster_col: str,
    text_col: str,
    embedding_col: str = "embedding",
    max_keywords: int = 5,
    max_examples: int = 10,
    stop_words=None,
) -> Dict[str, Any]
```

Per ogni cluster estrae:

- **keywords**: parole distintive via TF-IDF
- **central_examples**: item più vicini al centroide del cluster

Output:

```json
{
  "0": {
    "size": 45,
    "keywords": ["doppia", "lastra", "orditura", "metallica", "isolamento"],
    "central_examples": [
      {"id": "item_123", "desc": "Parete doppia lastra..."},
      {"id": "item_456", "desc": "Controparete con isolamento..."}
    ]
  }
}
```

## 23.9 - Modalità Strict Basins

Se `strict_basins=True`:

- Ogni item resta nel bacino del proprio WBS6 originale
- Non c'è migrazione verso altri poli
- Utile quando la tassonomia è affidabile e si vuole solo sub-clusterizzare

```python
df_out, reports = gc.fit_predict(df, strict_basins=True)
# Tutti gli item con wbs6="X" finiscono in assigned_basin="X"
```

## 23.10 - Esempio completo

```python
from logic.gravitational_clustering import GravitationalClustering
import pandas as pd

# Dati: item con embedding e wbs6
df = pd.DataFrame({
    "id": ["a", "b", "c", ...],
    "description": ["Parete cartongesso...", "Controsoffitto...", ...],
    "embedding": [[0.1, 0.2, ...], [0.3, 0.1, ...], ...],
    "wbs6": ["Pareti", "Controsoffitti", ...]
})

# Configura
gc = GravitationalClustering(
    min_basin_size=10,
    adaptive_percentile=5,
    prototype_method="median",
)

# Esegui
df_out, reports = gc.fit_predict(
    df,
    margin=0.05,
    hdb_min_cluster_size=5,
)

# Risultati
print(df_out[["id", "assigned_basin", "cluster_id", "attraction_score"]])
print(reports["Pareti"]["0"]["keywords"])  # keyword primo cluster
```

## 23.11 - Parametri consigliati

| Scenario | min_basin_size | adaptive_percentile | margin |
|----------|----------------|---------------------|--------|
| Dataset piccolo (<500) | 10 | 10 | 0.0 |
| Dataset medio (500-5000) | 20 | 5 | 0.02 |
| Dataset grande (>5000) | 50 | 3 | 0.05 |

## 23.12 - Debug e troubleshooting

### Troppi item marcati come noise

Cause possibili:

1. **Soglie troppo alte**: abbassa `adaptive_percentile` (es. da 5 a 10)
2. **Embedding di bassa qualità**: verifica che siano normalizzati
3. **WBS6 mancanti**: item senza categoria non hanno prototipo

### Cluster troppo grandi/piccoli

Modifica i parametri HDBSCAN:

```python
df_out, _ = gc.fit_predict(
    df,
    hdb_min_cluster_size=10,  # più grande = cluster più grandi
    hdb_min_samples=3,        # più basso = cluster più densi
)
```

### No HDBSCAN disponibile

Se vedi warning "Falling back to Agglomerative":

```bash
pip install hdbscan
```

Oppure usa sklearn >=1.3 che include HDBSCAN.

## 23.13 - Integrazione con Price Analysis

L'output del clustering viene usato da `price_analysis.py` per:

1. **Analisi intra-cluster**: confronto prezzi tra item dello stesso cluster
2. **Rilevamento outlier**: un item con prezzo molto diverso dal cluster è sospetto
3. **Stima prezzo equo**: mediana pesata degli item simili nello stesso cluster

```python
# In price_analysis.py
similar_items = df_out[df_out["cluster_id"] == target_cluster_id]
estimated_price = weighted_median(similar_items["price"], similar_items["attraction_score"])
```

