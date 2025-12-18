# 06 - Runtime config, `.env`, alias e connessioni

Obiettivo: saper configurare l'app in locale e capire "da dove arrivano" i valori (Mongo, Python, base URL API, ecc.).

Questo capitolo è pratico: se sai rispondere a "che valore sto usando e perché?", metà dei problemi di avvio/debug spariscono.

## 06.1 - I 3 posti dove puoi configurare cose (e cosa cambia)

In un progetto Nuxt tipico i valori possono arrivare da:

1) variabili ambiente (`.env` o env del sistema)
2) `nuxt.config.ts` (default e wiring)
3) runtimeConfig (accessibile in app e/o server)

La regola di sicurezza:

- segreti (DB URI, token): solo runtimeConfig privato (server)
- valori pubblici (base URL pubblico, feature flag innocui): runtimeConfig public

## 06.2 - `nuxt.config.ts`: cosa leggere per primo

File: `nuxt.config.ts`

Punti chiave per Taboolo:

- `srcDir: 'app/'`: tutto il frontend sta in `app/`
- `modules`: Nuxt UI, icon, color-mode, pinia
- `nitro.alias`: alias per import server-side
- `nitro.imports.dirs`: auto-import su cartelle server
- `runtimeConfig`: Mongo e Python base URL

Se un import ti sembra "magico" (es. `#models`), è quasi sempre qui.

## 06.3 - Alias Nitro: `#models`, `#utils`, `#services`, `#importers`

In `nuxt.config.ts` trovi:

- `#models` -> `server/models`
- `#utils` -> `server/utils`
- `#importers` -> `server/importers`
- `#services` -> `server/services`

Esempio:

```ts
import { Project } from '#models'
import { proxyMultipartToPython } from '#utils/python-proxy'
```

Questo rende il codice più leggibile e stabile (meno path relativi lunghi).

## 06.4 - Runtime config: pubblico vs privato

In `nuxt.config.ts` trovi:

```ts
runtimeConfig: {
  public: {
    apiBaseUrl: '',
  },
  mongodbUri: process.env.MONGODB_URI || '',
  pythonApiBaseUrl: process.env.PYTHON_API_URL || 'http://localhost:8000/api/v1',
}
```

Interpretazione:

- `runtimeConfig.public.*` è leggibile anche dal browser (quindi non metterci segreti)
- `runtimeConfig.mongodbUri` e `runtimeConfig.pythonApiBaseUrl` sono privati (server)

Sul server leggi con:

```ts
const config = useRuntimeConfig()
```

Nel frontend leggi con:

```ts
const config = useRuntimeConfig()
const base = config.public.apiBaseUrl
```

## 06.5 - `.env`: quali variabili contano qui

Variabili "core" per far girare Taboolo:

- `MONGODB_URI` (es. `mongodb://localhost:27017/taboolo`)
- `PYTHON_API_URL` (es. `http://localhost:8000/api/v1`)

Altre variabili che possono comparire lato frontend:

- `NUXT_PUBLIC_API_BASE_URL` (se vuoi forzare dove punta il frontend)

Nota: `app/lib/api-client.ts` usa più strategie (runtimeConfig e fallback) perché questa repo contiene anche tracce/compatibilità con versioni precedenti.

## 06.6 - Connessione MongoDB (Nitro plugin)

File: `server/plugins/mongoose.ts`

Comportamento:

1) legge `mongodbUri` da runtimeConfig (oppure `process.env.MONGODB_URI`)
2) se non c'è, usa un fallback locale
3) chiama `mongoose.connect(uri)`

Se Mongo non è raggiungibile:

- il server Nuxt può partire comunque
- ma le API che interrogano il DB falliscono (500 o errori di connessione)

Debug tipico:

- controlla il log "Connected to MongoDB"
- controlla che l'URI sia corretto
- verifica che `mongod` stia girando

## 06.7 - Python importer: base URL e proxy multipart

File: `server/utils/python-proxy.ts`

Comportamento:

1) legge il body multipart inviato dal browser (file + campi)
2) ricostruisce un `FormData`
3) invia la richiesta HTTP a `pythonApiBaseUrl` (es. `http://localhost:8000/api/v1`)
4) propaga status code e payload (anche errori)

Questa scelta è importante:

- il browser carica file verso `/api/...` (Nitro)
- Nitro fa da "reverse proxy" verso Python
- Python risponde con JSON
- Nitro mappa/persiste su Mongo

## 06.8 - Esercizi (config e debug)

1) Cambia `PYTHON_API_URL` e verifica che la preview import fallisca/successa in modo coerente.
2) Apri `server/utils/python-proxy.ts` e segui:
   - come costruisce `FormData`
   - come gestisce risposte non-JSON
3) Spegni Mongo e guarda cosa succede su:
   - `GET /api/projects`
   - `GET /api/projects/:id/context`

Se sai diagnosticare questi 3 casi, sei pronto per il capitolo 07 (endpoint Nitro) e 08 (Mongo/Mongoose).
