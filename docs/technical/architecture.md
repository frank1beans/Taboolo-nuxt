# Architettura

Taboolo è composto da tre blocchi principali che comunicano tra loro.

---

## Componenti

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│                     Nuxt 4 (Vue 3)                          │
│                    app/, pages/, components/                 │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend Nuxt                            │
│                    Nitro (server/)                          │
│              API Routes, Proxy Python, MongoDB               │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────┐    ┌──────────────────────────────────┐
│      MongoDB         │    │       Servizio Python            │
│    (Persistenza)     │    │     FastAPI (services/importer)  │
│                      │    │   Parser, Embeddings, Analytics  │
└──────────────────────┘    └──────────────────────────────────┘
```

---

## Flusso Dati

### Import Computo

1. Upload file da UI
2. Nuxt inoltra a Python (`/import-six`, `/import-xpwe`)
3. Python parsa e normalizza
4. Nuxt persiste su MongoDB (WBS, PriceList, Estimate, Items)

### Import Offerte

1. Upload Excel da wizard
2. Nuxt inoltra a Python (`/ritorni`)
3. Python normalizza le righe
4. Nuxt crea Offer, OfferItem, genera Alert

### Analytics

1. Embeddings calcolati da Python (Jina)
2. UMAP genera coordinate 2D/3D
3. Clustering raggruppa voci simili
4. Frontend visualizza con Plotly

---

## Directory Structure

```
Taboolo-nuxt/
├── app/               # Frontend Nuxt
│   ├── pages/         # Route e pagine
│   ├── components/    # Componenti Vue
│   ├── composables/   # Hook riutilizzabili
│   └── assets/        # CSS e risorse
├── server/            # Backend Nitro
│   ├── api/           # Route API
│   ├── models/        # Schema Mongoose
│   └── services/      # Logica business
├── services/
│   └── importer/      # Servizio Python
│       ├── api/       # FastAPI routes
│       ├── parsers/   # Parser SIX, XPWE, Excel
│       ├── embedding/ # Jina embeddings
│       └── analytics/ # Mappe e analisi
└── docs/              # Documentazione
```

---

## Comunicazione

| Da | A | Protocollo | Note |
|----|---|------------|------|
| Frontend | Backend Nuxt | HTTP (fetch) | `/api/*` |
| Backend | MongoDB | MongoDB driver | Mongoose |
| Backend | Python | HTTP proxy | `PYTHON_API_URL` |
| Python | Jina | HTTPS | Embeddings API |
| Python | LLM | HTTPS | Estrazione proprietà |
