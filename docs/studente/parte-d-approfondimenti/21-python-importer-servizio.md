# 21 - Servizio Python importer: architettura, endpoint, debug

Obiettivo: capire l'importer Python presente in repo (`services/importer/`), come si avvia, che endpoint espone e come estenderlo in modo sicuro.

Taboolo usa un approccio "split responsibilities":

- Python: parsing e normalizzazione di formati complessi (SIX XML, Excel ritorni)
- Nitro (Nuxt server): proxy multipart, mapping, persistenza Mongo, contratti verso il frontend

Questo capitolo guarda il lato Python, ma sempre collegandolo al resto del sistema.

## 21.1 - Dove sta e com'è organizzato

Cartella: `services/importer/`

Punti di ingresso:

- `services/importer/main.py`: crea l'app FastAPI, CORS, lifespan/logging
- `services/importer/api/router.py`: aggrega i router e applica prefissi
- `services/importer/core/config.py`: settings (env vars, limiti upload, CORS)

Cartelle importanti:

- `services/importer/api/endpoints/`: endpoint HTTP (raw, returns)
- `services/importer/parsers/`: parser per formati (six, excel, lx, mx)
- `services/importer/logic/`: servizi di parsing/trasformazione (es. raw_import_service)
- `services/importer/schemas/`: modelli Pydantic e schemi dati
- `services/importer/registry.py`: registry dei parser e compatibilità legacy

## 21.2 - Avvio in locale (sviluppo)

Esempio:

```bash
cd services/importer
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Nota:

- `main.py` carica un `.env` (se presente) nella cartella `services/importer/`
- le settings usano prefix `TABOO_` (vedi `core/config.py`)

## 21.3 - Config e sicurezza (cosa è già previsto)

File: `services/importer/core/config.py`

Impostazioni rilevanti:

- `api_v1_prefix` (default `/api/v1`)
- `max_upload_size_mb` (limite upload)
- `import_rate_limit_per_minute` (rate limit)
- `cors_origins` (CORS whitelist)
- `debug` (abilita swagger `/docs` solo se debug)

Nota importante: in produzione, evitare CORS permissivo e tenere disabilitati swagger/redoc se non necessari.

## 21.4 - Endpoint esposti (mappa)

Il router monta i servizi sotto:

- prefix: `settings.api_v1_prefix` (default `/api/v1`)
- prefix aggiuntivo: `/commesse`

Quindi gli endpoint sono del tipo:

- `/api/v1/commesse/{commessa_id}/...`

### 21.4.1 - Import SIX raw (SIX XML)

File: `services/importer/api/endpoints/raw.py`

Endpoint:

- `POST /api/v1/commesse/{commessa_id}/import-six/raw/preview`
- `POST /api/v1/commesse/{commessa_id}/import-six/raw`

Ruolo:

- parse-a il file SIX e restituisce un payload "normalizzato" (non persistito)
- Nitro lo riceve e decide come salvarlo in Mongo

### 21.4.2 - Import ritorni/offerte (Excel)

File: `services/importer/api/endpoints/returns.py`

Endpoint principali:

- `POST /api/v1/commesse/{commessa_id}/ritorni` (entrypoint generico, mode lx/mx/excel)
- endpoint dedicati come:
  - `POST /api/v1/commesse/{commessa_id}/returns/lx`
  - `POST /api/v1/commesse/{commessa_id}/returns/mx`

Questi endpoint ricevono:

- file Excel
- parametri di mapping (sheet, colonne codice/descrizione/prezzo/quantità, ecc.)
- configurazioni round/impresa (anche batch/multi-company)

## 21.5 - Come Nitro lo chiama (collegamento con la repo Nuxt)

Nitro chiama Python tramite:

- `server/utils/python-proxy.ts` (proxy multipart)
- base URL configurata con `PYTHON_API_URL` (runtime config)

Esempi:

- import SIX raw:
  - `server/importers/python-six/client.ts` chiama `/commesse/:id/import-six/raw` e `/raw/preview`
- import offerte:
  - `server/api/projects/[id]/offers.post.ts` chiama `/commesse/:id/ritorni`

Se qualcosa non funziona, guarda sempre:

1) `PYTHON_API_URL` (punti a `http://localhost:8000/api/v1`?)
2) path e prefissi (`/api/v1` c'è?)
3) CORS (se chiami Python direttamente da browser, cosa che normalmente non fai qui)

## 21.6 - Parser registry: nuovo vs legacy

File: `services/importer/registry.py`

Qui si vede una transizione architetturale:

- "new domain parser" per SIX (`SixParser`) registrato in `_PARSERS`
- "legacy registry" per parsing Excel/LX/MX che usa tempfile e funzioni legacy

Questo ti dice una cosa importante:

- il servizio è in migrazione: alcune parti sono nuove e tipizzate, altre sono compatibilità

Quando aggiungi nuovo codice, preferisci l'approccio "new domain" se possibile.

## 21.7 - SixParser: cosa fa e perché è complesso

File: `services/importer/parsers/six/parser.py`

Responsabilità:

- leggere XML SIX (con namespace)
- estrarre:
  - preventivi (baseline)
  - listini e voci di listino
  - WBS / gruppi
  - misurazioni (righe con quantità e dettagli)
- normalizzare numeri, codici, descrizioni
- **filtrare i gruppi WBS**: vengono mantenuti solo i nodi effettivamente utilizzati da misurazioni (`wbs_node_ids`) o da voci di listino (`wbs_ids`). Gruppi vuoti o non referenziati vengono scartati per mantenere leggero il database.

Nota: il parser contiene anche logica di "risoluzione quantità" (riferimenti, formule, arrotondamenti) perché i file reali spesso non sono semplici righe piatte.

## 21.8 - Rate limit e limiti upload: perché esistono

Nel parsing di file reali:

- un file può essere enorme
- un endpoint può essere chiamato più volte (utente che riprova)
- un attaccante potrebbe abusare del servizio

Quindi esistono:

- limite dimensione file (`max_upload_size_mb`)
- rate limiter (sliding window)

Anche in un contesto "solo interno", questi vincoli ti proteggono da incidenti.

## 21.9 - Esercizio: aggiungere un nuovo parser (traccia)

Scenario: vuoi supportare un nuovo formato `foo`.

Passi consigliati:

1) definisci un parser che implementa `ParserProtocol` (`core/interfaces.py`)
2) registralo in `_PARSERS` in `registry.py`
3) aggiungi un endpoint FastAPI che:
   - valida estensione/tipo
   - legge bytes
   - invoca parser
   - ritorna un modello Pydantic (schema stabile)
4) lato Nitro:
   - aggiungi una funzione client (simile a `runSixImportRaw`)
   - aggiungi endpoint `/api/...` che fa proxy e persistenza

Questo è il modo "pulito" per estendere l'import senza creare spaghetti tra Python e Nitro.
