# Taboolo (Nuxt)

Repository per Taboolo: Nuxt 4 (frontend), Nitro API, MongoDB e servizio Python opzionale per parsing/import.

## Documentazione

- Guida generale: `docs/README.md`
- Indice completo: `docs/SUMMARY.md`

## Avvio rapido (sviluppo)

Prerequisiti:

- Node.js LTS + pnpm
- MongoDB raggiungibile
- Python 3.11+ (solo per la pipeline di import)

Install:

```bash
pnpm install
```

Dev server (Nuxt):

```bash
pnpm dev
```

App su:

- `http://localhost:3000`

Lint:

```bash
pnpm lint
```

## Configurazione runtime

Variabili principali:

- `MONGODB_URI` (obbligatoria per le API)
- `PYTHON_API_URL` (default: `http://localhost:8000/api/v1`)
- `PYTHON_PROXY_MAX_UPLOAD_MB` (default: `100`)
- `PYTHON_PROXY_TIMEOUT_MS` (default: `600000`)

Dettagli: `docs/reference/configurazione.md`

## Servizio Python importer (locale)

Esempio:

```bash
cd services/importer
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
