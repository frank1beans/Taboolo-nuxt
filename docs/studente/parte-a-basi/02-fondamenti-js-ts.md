# 02 - Fondamenti JavaScript/TypeScript (pratici, per questa repo)

Obiettivo: arrivare a leggere e modificare il codice con serenità, senza "panico da TypeScript".

Questo non è un corso completo di programmazione. È un ponte: ti insegna solo quello che ti serve per capire Nuxt, Nitro e il tipo di codice che trovi in questa repo.

## 02.1 - Un concetto chiave: JavaScript gira in due mondi

In Taboolo scriverai codice in due ambienti:

- browser (UI): pagine `.vue`, composables, componenti
- server (Nitro/Node): endpoint in `server/api/`, servizi e modelli Mongo

La stessa sintassi, ma oggetti diversi:

- browser: `window`, DOM, DevTools
- server: filesystem, variabili ambiente, connessioni DB

Nuxt mette insieme i due mondi, ma tu devi sempre chiederti: "questa riga gira sul client o sul server?".

## 02.2 - Variabili, funzioni, oggetti: la grammatica minima

In TypeScript vedrai continuamente forme come queste:

```ts
const projectId = route.params.id as string

export async function upsertEstimate(projectId: string, data: Record<string, unknown>) {
  // ...
}
```

Concetti:

- `const`: variabile non riassegnabile (preferita quasi sempre)
- `let`: variabile riassegnabile (usala quando serve davvero)
- `async function`: funzione asincrona (ritorna una `Promise`)
- oggetti `{ ... }`: strutture dati (anche annidate)
- tipizzazione `: string`: aiuta IDE e controlli (e ti evita bug stupidi)

## 02.3 - Moduli (import/export): come si incastra la repo

Questa repo è ESM: in `package.json` c'è `"type": "module"`.

Vedrai spesso:

```ts
import { defineEventHandler } from 'h3'
import { Project } from '#models'

export default defineEventHandler(async (event) => {
  // ...
})
```

Regola pratica:

- `import ... from '...'` porta dentro simboli da un altro file/pacchetto
- `export` / `export default` espone simboli ad altri file

Nuxt/Nitro usa spesso `export default` per convenzione:

- endpoint in `server/api/**`
- pagine in `app/pages/**`

## 02.4 - Tipi: perché qui sono importanti

In Taboolo i tipi servono a due cose:

1) contratti tra frontend e backend (request/response)
2) stabilità in presenza di dati "sporchi" (import file, mapping, normalizzazione)

Fonti tipiche:

- frontend: `app/types/api.ts`, `app/types/project.ts`, `app/types/wbs.ts`
- backend: `server/utils/contracts.ts` e gli schemi Mongoose

### 02.4.1 - `type` vs `interface` (regola semplice)

- `interface` è ottima per descrivere "forme" di oggetti e per estenderle
- `type` è più flessibile (union/intersection, utility types)

In una codebase reale puoi usarle entrambe. Se hai dubbi: usa `type` per payload e `interface` per oggetti destinati a estensioni multiple.

### 02.4.2 - Optional e nullabilità (molto comune qui)

In TS:

- `foo?: string` significa che può mancare (cioè `undefined`)
- `foo?: string | null` significa che può mancare o essere esplicitamente `null`

Nel web succede spesso che:

- in query string arriva `"null"` o `"undefined"` come stringa
- in JSON arriva `null` per indicare "assenza intenzionale"

Quando scrivi endpoint o mapper, chiediti sempre: "questo campo è assente o è null?".

### 02.4.3 - `any` vs `unknown` (e perché nell'import vedi `any`)

- `any`: disattiva il type-checking (comodo, ma pericoloso)
- `unknown`: è "non so cos'è", quindi devi controllare prima di usare

Nell'import trovi spesso payload molto dinamici: un servizio Python può cambiare formato o contenere casi particolari. Per questo trovi `Record<string, any>` o `any`.

Regola pratica per codice nuovo:

- per payload stabili: tipi espliciti
- per payload non affidabili: `unknown` + validazione/narrowing

Esempio di type guard semplice:

```ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
```

### 02.4.4 - Utility types (ti salvano la vita)

Se vuoi manipolare tipi senza riscriverli:

- `Partial<T>`: rende tutti i campi opzionali
- `Pick<T, 'a' | 'b'>`: prende solo alcuni campi
- `Omit<T, 'a'>`: toglie alcuni campi

Li userai spesso per:

- aggiornamenti parziali (PATCH)
- form di editing (solo subset dei campi)

## 02.5 - Promise e async/await: il ritmo del codice

Molte operazioni sono asincrone:

- fetch HTTP
- query Mongo
- lettura multipart (upload file)

Quindi vedrai continuamente `async`/`await`:

```ts
const result = await apiFetch('/projects')
```

Significa: ferma la funzione finché non arriva il risultato.

### 02.5.1 - `Promise.all`: parallelizzare

Se hai due query indipendenti, avviale insieme:

```ts
const [projects, total] = await Promise.all([
  Project.find(filter).lean(),
  Project.countDocuments(filter),
])
```

Vantaggio: spesso è più veloce (non aspetti la prima query prima di partire con la seconda).

## 02.6 - Oggetti, array, trasformazioni: la forma del lavoro reale

Nel 90% dei casi lavorerai con:

- array di righe (items)
- mappe (dictionary) per indicizzare cose per id
- trasformazioni: `map`, `filter`, `reduce`

Esempio mentale: importi 10.000 righe e devi:

1) normalizzare unità e numeri
2) raggruppare per WBS
3) calcolare totali

Qui le trasformazioni contano più delle classi.

## 02.7 - Error handling: distinguere errori "utente" e errori "sistema"

Due forme tipiche:

### try/catch

```ts
try {
  // ...
} catch (error) {
  // ...
}
```

### `createError` lato API (Nitro)

Negli endpoint (`server/api/*`) vedrai:

```ts
throw createError({ statusCode: 400, statusMessage: 'Project ID required' })
```

Questo produce una risposta HTTP coerente (status code + messaggio) consumabile dal frontend.

Regola pratica:

- 400: input errato (parametri mancanti, id non valido)
- 404: risorsa non trovata
- 409: conflitto (duplicati, vincoli)
- 500: errore interno (bug, DB down, timeout)

## 02.8 - "TypeScript in stile Nuxt": le due magie che confondono

1) Auto-import Nuxt:
   - alcune funzioni non sono importate esplicitamente (es. `useFetch`, `useRuntimeConfig`)
2) Alias Nitro:
   - `#models`, `#services`, `#utils`, `#importers` sono definiti in `nuxt.config.ts`

Se un import ti sembra "magico", guarda `nuxt.config.ts` (sezione `nitro.alias` e `imports.dirs`).

## 02.9 - Esercizi consigliati (da fare davvero)

1) Apri `server/api/projects/index.get.ts` e individua:
   - dove legge query params
   - dove interroga Mongo
   - dove costruisce la response JSON
2) Apri `app/lib/api-client.ts` e individua:
   - `apiFetch`
   - come gestisce errori e token
3) Apri `server/utils/python-proxy.ts` e individua:
   - come legge multipart
   - come costruisce `FormData` per Python

## 02.10 - Micro-progetto: normalizzazione numeri (esercizio fondamentale)

Scopo: imparare a scrivere TS robusto per input sporchi (tipico import).

Scrivi una funzione che:

- prende `value: unknown`
- ritorna `number | null`
- accetta numeri o stringhe numeriche (anche con virgola)
- ritorna `null` per tutto il resto

Poi confrontala con l'approccio usato in `server/utils/normalize.ts` e nei servizi di import.

Se riesci a fare questo esercizio, hai già imparato metà della "programmazione reale" di questo progetto.
