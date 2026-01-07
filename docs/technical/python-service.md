# Servizio Python

Il servizio Python (`services/importer`) gestisce parsing, embeddings e analytics.

---

## Struttura

```
services/importer/
├── main.py              # Entry point FastAPI
├── api/                 # Router e endpoint
│   ├── commesse/        # Import computi e offerte
│   ├── analytics/       # Mappe e analisi
│   └── extraction/      # Estrazione proprietà
├── parsers/             # Parser file
│   ├── six_parser.py    # Parser SIX/XML
│   ├── xpwe_parser.py   # Parser XPWE
│   └── excel_parser.py  # Parser offerte Excel
├── ingestion/           # Normalizzazione dati
├── embedding/           # Jina embeddings
├── analytics/           # UMAP e clustering
├── core/                # Config e utilities
└── application/         # Orchestrazione
```

---

## Parser

### SIX/XML (STR Vision)

File: `parsers/six_parser.py`

Estrae:
- Preventivi nel file
- WBS gerarchica
- Voci di listino e computo

### XPWE (PriMus/ACCA)

File: `parsers/xpwe_parser.py`

Estrae:
- Struttura progetto
- Mappatura livelli WBS
- Voci con prezzi

### Excel (Offerte)

File: `parsers/excel_parser.py`

Supporta:
- LX: lista aggregata
- MX: computo dettagliato
- Multi-sheet, multi-impresa

---

## Embeddings

File: `embedding/jina_service.py`

- Usa Jina AI API
- Genera vettori 1024-dim
- Batch processing

```python
# Esempio
embeddings = jina_service.embed(["descrizione voce 1", "descrizione voce 2"])
```

---

## Analytics

### UMAP

Riduce dimensionalità da 1024 a 2D/3D.

### Clustering

Gravitational Clustering raggruppa voci simili.

### Price Analysis

Calcola outlier, medie, deviazioni per cluster.

---

## Esecuzione

```bash
cd services/importer

# Dev
python main.py

# Produzione
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## Logging

Configurato via `TABOO_LOG_LEVEL`:
- `DEBUG`: dettagliato
- `INFO`: standard
- `WARNING`: solo warning
- `ERROR`: solo errori
