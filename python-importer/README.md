# Python Importer (SIX / Excel LC/MC)

Questa cartella contiene l'importer Python (FastAPI) estratto da `TABOOLO/backend`. Serve a processare i file SIX/XML e le offerte LC/MC, esponendo gli endpoint chiamati da Nuxt.

## Avvio rapido
```bash
cd python-importer
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt  # se usi requirements, oppure pip install -e .
uvicorn main:app --reload --port 8000
```

- Nuxt deve puntare a questo servizio con `PYTHON_API_BASE_URL=http://localhost:8000/api/v1`.
- Gli endpoint rilevanti:
  - `POST /api/v1/commesse/{projectId}/import-six/preview`
  - `POST /api/v1/commesse/{projectId}/import-six`
  - (LC/MC) `POST /api/v1/commesse/{projectId}/ritorni` e `/ritorni/batch-single-file`
  - (Computo progetto) `POST /api/v1/commesse/{projectId}/computo-progetto`
  - (WBS) `POST|PUT /api/v1/commesse/{projectId}/wbs/upload`

In questa fase l'app FastAPI è stata ridotta a modalità **stateless**: la persistenza su SQL è disattivata e gli endpoint SIX restituiscono solo il risultato del parsing, da salvare su Mongo via Nitro.

## Note di migrazione
- Questa copia sostituisce l'uso di `TABOOLO/backend` all'interno del repo Nuxt: avvia il servizio da qui.
- Il codice è quello originale del backend, puoi alleggerirlo rimuovendo le parti non necessarie (auth, UI React) se vuoi ridurre le dipendenze.
- Mantieni il file `.env` in questa cartella (non committato) con le stesse variabili che usavi prima.

## Import servizi SIX
- `SixImportService` (services/six_import_service.py) produce le viste aggregate pronte per l'anteprima Nitro (catalogo prezzi, computo).
- `SixRawImportService` (services/raw_import_service.py) espone le entità grezze (`RawUnit`, `RawPriceList`, `RawGroupValue`, `RawProduct`, `RawPreventivoMetadata`, `RawRilevazione`) senza render o aggregazioni. Usa i normalizzatori per calcolare `quantity_direct` e `quantity_total_resolved`, così il backend Node può salvare direttamente su MongoDB.
