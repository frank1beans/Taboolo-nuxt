# Python SIX Importer (proxy da Nuxt/Nitro)

Questa cartella centralizza le chiamate dal backend Nuxt (Nitro) al servizio Python che gestisce il parsing dei file SIX/XML.

## Dove sta il servizio Python (in questa repo)

Il servizio è incluso nella repo in:

- `services/importer/`

Entry point:

- `services/importer/main.py` (FastAPI)

## Avvio servizio Python (dev)

Esempio:

```bash
cd services/importer
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Endpoint richiesti (SIX raw)

Con prefix API di default `/api/v1`, il servizio deve esporre:

- `POST /api/v1/commesse/{projectId}/import-six/preview`
- `POST /api/v1/commesse/{projectId}/import-six`

Nota: nel client esistono anche chiamate "non raw" per compatibilità/legacy, ma il flusso stabile per SIX in questa repo è raw (ora endpoint standard).

## Configurazione Nuxt/Nitro

In `.env` (o variabili runtime) imposta:

- `PYTHON_API_URL=http://localhost:8000/api/v1`

Questo alimenta `runtimeConfig.pythonApiBaseUrl` (vedi `nuxt.config.ts`) e viene usato da:

- `server/utils/python-proxy.ts` (proxy multipart)

## Convenzioni

- Tutto il traffico verso Python passa da `server/importers/python-six/client.ts` (mantenere mapping e gestione errori in un punto unico).
- Mapper payload: `server/utils/python-mappers.ts`.
- Persistenza su Mongo: `server/services/ImportPersistenceService.ts`.

