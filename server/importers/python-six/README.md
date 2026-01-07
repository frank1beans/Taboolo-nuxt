# Python SIX importer client (Nuxt)

Questa cartella contiene il client Nuxt/Nitro per il parsing SIX/XML via servizio Python.

## Dove sta il servizio Python

- `services/importer/`
- Entry point: `services/importer/main.py`

## Avvio in locale

```bash
cd services/importer
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Endpoint usati

Base URL: `PYTHON_API_URL` (default `http://localhost:8000/api/v1`).

- `POST /commesse/{projectId}/import-six/preview`
- `POST /commesse/{projectId}/import-six`

## Modalita raw

La modalita raw e' quella di default. La selezione avviene nel backend Nuxt via query `mode=raw`.
La persistenza e' gestita da `server/services/ImportPersistenceService.ts`.

## File coinvolti

- `server/importers/python-six/client.ts` (proxy e mapping)
- `server/utils/python-proxy.ts` (proxy multipart)
- `server/utils/python-mappers.ts` (mapping payload)
- `server/api/projects/[id]/import-six*.ts` (endpoint API)

## Configurazione

- `PYTHON_API_URL`
- `PYTHON_PROXY_MAX_UPLOAD_MB`
- `PYTHON_PROXY_TIMEOUT_MS`
