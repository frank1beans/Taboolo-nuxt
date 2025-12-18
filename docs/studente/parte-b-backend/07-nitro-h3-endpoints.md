# 07 - Nitro + h3: costruire un backend dentro Nuxt

Obiettivo: capire e saper scrivere endpoint in `server/api/`, usando h3 (il layer HTTP di Nitro).

In Taboolo il backend è "dentro" la repo Nuxt:

- stessa base di codice
- stesso deploy
- confine chiaro: la UI chiama `/api/...`, il server risponde JSON

## 07.1 - Cos'è un endpoint Nitro (in questa repo)

Un file come:

- `server/api/projects/index.get.ts`

diventa automaticamente:

- `GET /api/projects`

La convenzione è:

- `*.get.ts` -> GET
- `*.post.ts` -> POST
- `*.put.ts` -> PUT
- `*.patch.ts` -> PATCH
- `*.delete.ts` -> DELETE

E le cartelle con segmenti dinamici:

- `server/api/projects/[id].get.ts` -> `/api/projects/:id`
- `server/api/projects/[id]/estimate/[estimateId]/items.get.ts` -> `/api/projects/:id/estimate/:estimateId/items`

## 07.2 - h3: il modello mentale minimo

Un endpoint tipico è:

```ts
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  return { ok: true }
})
```

`event` contiene:

- richiesta (method, url, headers, body)
- strumenti h3 per leggere input e scrivere output

Funzioni h3 che vedrai spesso in questa repo:

- `getRouterParam(event, 'id')` (parametri nel path)
- `getQuery(event)` (query string)
- `readBody(event)` (JSON body)
- `readMultipartFormData(event)` (multipart, file upload)
- `createError({ statusCode, statusMessage, data })` (errori HTTP coerenti)

## 07.3 - Input: router params vs query vs body

### 07.3.1 - Router params (path)

Esempio: `/api/projects/:id`

```ts
const projectId = getRouterParam(event, 'id')
```

Qui di solito validi:

- presenza (manca -> 400)
- formato (ObjectId -> 400)
- esistenza a DB (non trovato -> 404)

### 07.3.2 - Query params

Esempio: `/api/projects/:id/offers?estimate_id=...&round=1`

```ts
const query = getQuery(event)
```

Nota pratica: query string è sempre stringa (o array di stringhe). Quindi devi convertire:

- `Number(query.round)`
- `String(query.estimate_id)`

E gestire valori strani: `"null"`, `"undefined"`, stringhe vuote.

### 07.3.3 - Body JSON

Quando il client invia JSON:

```ts
const body = await readBody(event)
```

Esempi reali:

- `POST /api/projects` (`server/api/projects/index.post.ts`)
- `PUT /api/projects/:id` (`server/api/projects/[id].put.ts`)

Regola: valida sempre i campi che ti servono. Anche se "sei tu" a chiamare l'API dal frontend, un domani quell'endpoint può essere chiamato diversamente.

### 07.3.4 - Multipart (upload file)

Per upload file si usa multipart. In Taboolo spesso non lo gestiamo direttamente negli endpoint: lo delegiamo a un proxy.

- file: `server/utils/python-proxy.ts`
- pattern: leggere multipart dal browser e inoltrare tutto al servizio Python

Questo evita di duplicare logica e mantiene il server Nuxt più "thin".

## 07.4 - Validare ObjectId: pattern fondamentale

Molti id sono Mongo ObjectId (string).

Pattern tipico:

```ts
import { Types } from 'mongoose'
import { createError } from 'h3'

if (!Types.ObjectId.isValid(id)) {
  throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
}
const oid = new Types.ObjectId(id)
```

Se non lo fai:

- rischi errori a cascata nelle query
- rischi 500 "inutili" invece di 400 chiaro

## 07.5 - Controller vs service: dove mettere la logica

In questa codebase:

- `server/api/**` = controller layer
  - valida input
  - chiama modelli o servizi
  - costruisce response (shape "UI-friendly")
- `server/services/**` = logica applicativa
  - import/persistenza
  - update/cascade delete
  - costruzione WBS

Regola pratica:

- se una logica è usata da più endpoint, mettila in un service
- se una logica è "dominio" (business), non metterla in una pagina Vue

## 07.6 - Serializzazione: perché esiste `serialize`

Mongo/Mongoose usa ObjectId e Date. Se ritorni documenti "nudi", potresti avere problemi di JSON serialization o forme incoerenti.

In Taboolo esiste un helper:

- `server/utils/serialize.ts`

Obiettivo:

- trasformare ObjectId in string
- rendere response stabili per il frontend

Regola: quando esponi dati Mongo, assicurati che i tipi siano JSON-safe.

## 07.7 - Errori: `createError` e status code coerenti

Un errore "utente" deve essere leggibile:

- 400: input non valido (id mancante, query errata)
- 404: non trovato
- 409: conflitto (duplicati)

Un errore "sistema" deve essere diagnosticabile:

- 500: bug, DB down, servizio Python non raggiungibile, ecc.

H3 ti permette:

```ts
throw createError({ statusCode: 400, statusMessage: 'Project ID required' })
```

Il frontend può leggere status e messaggio e mostrare toast/errore.

## 07.8 - Caso studio 1: import SIX (preview e import)

Endpoint:

- `POST /api/projects/:id/import-six/preview` -> `server/api/projects/[id]/import-six/preview.post.ts`
- `POST /api/projects/:id/import-six?raw=1` -> `server/api/projects/[id]/import-six.post.ts` (raw)

Flusso:

1) il browser invia file SIX in multipart a Nitro
2) Nitro fa da proxy verso Python (`server/utils/python-proxy.ts`)
3) Python parse-a e ritorna JSON (payload raw)
4) Nitro mappa/persiste su Mongo (`server/services/ImportPersistenceService.ts`)

Questo è il pattern più importante del backend Taboolo.

## 07.9 - Caso studio 2: import offerte (ritorni)

Endpoint:

- `POST /api/projects/:id/offers` -> `server/api/projects/[id]/offers.post.ts`

Flusso:

1) upload Excel dal browser (multipart)
2) proxy multipart verso Python: `/commesse/:id/ritorni`
3) Python ritorna computo normalizzato (JSON)
4) Nitro mappa e persiste come offerta collegata a una baseline

Qui spesso i problemi sono:

- mapping colonne (Excel)
- configurazioni round/impresa
- collegamento corretto a `estimate_id` baseline

## 07.10 - Esercizi guidati (scrivi un endpoint semplice)

### 07.10.1 - Endpoint ping

Crea:

- `GET /api/ping` -> `{ ok: true, time: "..." }`

Passi:

1) crea file `server/api/ping.get.ts`
2) implementa `defineEventHandler`
3) ritorna un JSON con timestamp (`new Date().toISOString()`)

Verifica:

- apri `http://localhost:3000/api/ping`

### 07.10.2 - Endpoint count (Mongo)

Crea:

- `GET /api/projects/count` -> `{ count: number }`

Suggerimenti:

- usa `Project.countDocuments()`
- gestisci errori con `createError`

## 07.11 - Reference

- elenco route: `docs/studente/appendici/riferimento/api-routes.md`
- esempi curl: `docs/studente/appendici/tecnico/11-api-esempi-curl.md`
