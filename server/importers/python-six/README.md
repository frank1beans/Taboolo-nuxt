# Python SIX Importer (proxy da Nuxt)

Questa cartella documenta e centralizza le chiamate al servizio Python che gestisce il parsing dei file SIX.

## Avvio servizio Python
- Posizionati in `python-importer` (importer FastAPI copiato fuori da `TABOOLO/backend`).
- Attiva l'ambiente virtuale e dipendenze (esempio):
  - Windows: `python -m venv .venv && .\\.venv\\Scripts\\activate && pip install -r requirements.txt`
  - macOS/Linux: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
- Avvia: `uvicorn main:app --reload --port 8000`
- Il servizio deve esporre gli endpoint:
  - `POST /api/v1/commesse/{projectId}/import-six/preview`
  - `POST /api/v1/commesse/{projectId}/import-six`

## Configurazione Nuxt
- In `.env` (o variabili runtime) imposta `PYTHON_API_BASE_URL=http://localhost:8000/api/v1`.
- Nitro userà questa variabile per proxare il multipart verso Python.

## Flusso supportato
- **Preview**: restituisce la lista di preventivi trovati nel file SIX.
- **Import**: esegue il parsing completo e restituisce il report (WBS, items, estimate_id, ecc.) che verrà poi mappato/persistito da Nitro.

## Convenzioni
- Tutto il traffico verso il servizio passa da `server/importers/python-six/client.ts` per riusare mapping e gestione errori.
- I mappers verso gli schema Mongo sono in `server/utils/python-mappers.ts`.
