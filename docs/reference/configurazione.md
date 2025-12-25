# 02 — Configurazione runtime

Questa sezione descrive come il runtime viene configurato e dove leggere/modificare i parametri.

## 2.1 — `nuxt.config.ts` (punti rilevanti)

File: `nuxt.config.ts`

Punti chiave:

- `srcDir: 'app/'` → il frontend vive in `app/`
- alias:
  - `@` → `./app`
  - Nitro alias: `#models`, `#utils`, `#importers`, `#services`

### Runtime config

`runtimeConfig` contiene:

- `public.apiBaseUrl` (di default vuoto; il client usa fallback)
- `mongodbUri` (da `process.env.MONGODB_URI`)
- `pythonApiBaseUrl` (da `process.env.PYTHON_API_URL` o default `http://localhost:8000/api/v1`)

## 2.2 — Connessione MongoDB

File: `server/plugins/mongoose.ts`

Comportamento:

- legge `config.mongodbUri` → fallback `process.env.MONGODB_URI` → fallback `mongodb://localhost:27017/taboolo`
- esegue `mongoose.connect(uri)`
- logga “Connected to MongoDB” o errore

Nota: in caso di errore di connessione, l’app può avviarsi ma le API che leggono/scrivono su DB falliranno.

## 2.3 — Proxy verso Python (importer)

File: `server/utils/python-proxy.ts`

Responsabilità:

- legge multipart dal client (`readMultipartFormData`)
- ricostruisce un `FormData` (con Blob per file)
- inoltra la richiesta al servizio Python (`fetch`)
- propaga status e payload (o errore) verso il client

Base URL:

- `useRuntimeConfig().pythonApiBaseUrl`

## 2.4 — Mapper dei payload Python → TS

File: `server/utils/python-mappers.ts`

Responsabilità:

- normalizzare campi (traduzioni chiavi, fallback descrizioni)
- uniformare `type` del preventivo (progetto vs ritorno)
- adattare strutture di preview/report

Nota: per la nuova pipeline Raw, `mapRawImportPayload` fa “pass-through” se il Python restituisce già `{ project, estimate, groups, price_list }`.

