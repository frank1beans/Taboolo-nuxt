# 02 — Fondamenti Web: JavaScript e TypeScript per chi viene da altri linguaggi

Benvenuto al secondo capitolo! Qui imparerai le basi di JavaScript e TypeScript necessarie per lavorare con Taboolo. Non è un corso completo di programmazione: è un **ponte** che usa quello che già sai (anche se solo concetti base o Python) per capire il codice che vedrai nella repository.

L'obiettivo è arrivare a leggere e modificare il codice con serenità, senza "panico da TypeScript".

**Tempo stimato:** 1-2 ore (con esercizi)

---

## Perché questo capitolo è importante

In Taboolo scriverai codice in due ambienti diversi:

1. **Browser (frontend)**: pagine `.vue`, componenti, composables
2. **Server (backend)**: endpoint in `server/api/`, modelli Mongoose, servizi

La stessa sintassi JavaScript/TypeScript funziona in entrambi, ma gli oggetti disponibili sono diversi:

| Ambiente | Oggetti disponibili | Dove vedi gli errori |
|----------|---------------------|----------------------|
| Browser | `window`, DOM, `document`, `fetch` | Console del browser (F12) |
| Server | filesystem, `process.env`, connessioni DB | Terminale di `pnpm dev` |

Nuxt unifica i due mondi, ma **tu devi sempre chiederti: "questa riga gira sul client o sul server?"**.

---

## La Pietra di Rosetta: JavaScript vs Python

Se conosci Python (anche solo le basi), JavaScript moderno ti sembrerà familiare. Ecco le corrispondenze principali:

### Variabili

| Python | JavaScript/TypeScript | Note |
|--------|----------------------|------|
| `x = 10` | `const x = 10` | `const` = non riassegnabile (usala di default) |
| `x = 10`; poi `x = 20` | `let x = 10`; poi `x = 20` | `let` = riassegnabile |
| (non esiste) | `var x = 10` | ⚠️ Vecchia sintassi, evitala |

**Regola pratica**: usa sempre `const` a meno che tu non debba riassegnare la variabile.

### Dizionari/Oggetti

| Python | JavaScript/TypeScript | Note |
|--------|----------------------|------|
| `d = {"nome": "Mario", "eta": 30}` | `const d = { nome: "Mario", eta: 30 }` | In JS le chiavi non richiedono virgolette se semplici |
| `d["nome"]` | `d.nome` oppure `d["nome"]` | La dot notation è più comune |
| `d.get("nome", "default")` | `d.nome ?? "default"` | `??` è il "nullish coalescing operator" |

### Liste/Array

| Python | JavaScript/TypeScript | Note |
|--------|----------------------|------|
| `l = [1, 2, 3]` | `const l = [1, 2, 3]` | Identico! |
| `len(l)` | `l.length` | Proprietà, non funzione |
| `l.append(4)` | `l.push(4)` | Nomi diversi, stessa cosa |
| `l[0]` | `l[0]` | Identico |

### Funzioni

| Python | JavaScript/TypeScript |
|--------|----------------------|
| `def somma(a, b):` | `function somma(a, b) {` |
| `    return a + b` | `    return a + b` |
| | `}` |

In TypeScript puoi (e dovresti) aggiungere i tipi:

```typescript
function somma(a: number, b: number): number {
    return a + b
}
```

### Arrow Functions (Lambda)

| Python | JavaScript/TypeScript | Note |
|--------|----------------------|------|
| `lambda x: x * 2` | `(x) => x * 2` | Si chiamano "arrow functions" |
| `lambda x, y: x + y` | `(x, y) => x + y` | Usatissime! |

Le arrow functions sono ovunque in JavaScript moderno. Le vedrai soprattutto come callback:

```typescript
// Python: list(filter(lambda x: x > 0, numeri))
// JavaScript:
const positivi = numeri.filter((x) => x > 0)
```

### Stringhe formattate

| Python | JavaScript/TypeScript | Note |
|--------|----------------------|------|
| `f"Ciao {nome}"` | `` `Ciao ${nome}` `` | Usa i **backticks** (`) non le virgolette |
| `f"Totale: {prezzo:.2f}€"` | `` `Totale: ${prezzo.toFixed(2)}€` `` | Formattazione diversa |

### Import/Export

| Python | JavaScript/TypeScript |
|--------|----------------------|
| `from lib import func` | `import { func } from 'lib'` |
| `import lib` | `import * as lib from 'lib'` |
| (nel file) `def func(): ...` | `export function func() { ... }` |
| (nel file) def principale | `export default function() { ... }` |

### Debug

| Python | JavaScript/TypeScript |
|--------|----------------------|
| `print(x)` | `console.log(x)` |
| `print(f"Valore: {x}")` | `console.log("Valore:", x)` |
| `breakpoint()` | `debugger` (nel codice) |

---

## TypeScript: JavaScript con i tipi

TypeScript è JavaScript con **annotazioni di tipo**. Se conosci i type hints di Python, il concetto è identico:

```python
# Python
def process(name: str) -> dict:
    ...
```

```typescript
// TypeScript
function process(name: string): Record<string, any> {
    ...
}
```

La differenza principale: **TypeScript controlla i tipi PRIMA di eseguire il codice** (in fase di compilazione), mentre Python li controlla solo a runtime (e spesso nemmeno).

### Perché i tipi sono importanti in Taboolo

In Taboolo i tipi servono a due cose fondamentali:

1. **Contratti tra frontend e backend**: quando il frontend chiama un'API, entrambi devono "parlare la stessa lingua"
2. **Stabilità con dati sporchi**: importiamo file Excel e XML che possono contenere qualsiasi cosa — i tipi ci proteggono

### Tipi base

```typescript
// Tipi primitivi
const nome: string = "Mario"
const eta: number = 30
const attivo: boolean = true

// Array
const numeri: number[] = [1, 2, 3]
const nomi: string[] = ["Mario", "Luigi"]

// Oggetti
const persona: { nome: string; eta: number } = {
    nome: "Mario",
    eta: 30
}
```

### Type vs Interface

Vedrai entrambi nel codice. Ecco quando usarli:

```typescript
// Usa TYPE per: payload, union, trasformazioni
type Price = number | null
type Response = { data: Project; status: number }

// Usa INTERFACE per: entità di dominio che potresti estendere
interface Project {
    id: string
    name: string
    budget: number
}

interface ProjectWithOwner extends Project {
    owner: string
}
```

**Regola semplice**: se hai dubbi, usa `type`. Funziona sempre.

### Optional e Nullabilità

Questo è **IMPORTANTISSIMO** perché i dati reali sono spesso incompleti:

```typescript
interface Voce {
    id: string              // Obbligatorio
    descrizione: string     // Obbligatoria
    prezzo?: number         // Opzionale (può essere undefined)
    note: string | null     // Obbligatoria, ma può essere null
}
```

La differenza tra `undefined` e `null`:

- `undefined`: "questo campo non esiste" o "non è stato impostato"
- `null`: "questo campo esiste ed è intenzionalmente vuoto"

Nel web succede spesso che:

- In query string arriva `"null"` o `"undefined"` come **stringa**
- In JSON arriva `null` per indicare assenza intenzionale

### any vs unknown

```typescript
// any = "fai quello che vuoi, non controllare"
let x: any = "ciao"
x = 42          // ✓ OK
x.qualsiasi()   // ✓ OK (ma potrebbe esplodere a runtime!)

// unknown = "non so cos'è, devo controllare prima di usare"
let y: unknown = "ciao"
y = 42          // ✓ OK
// y.qualsiasi()  // ✗ Errore! Devi prima verificare il tipo
if (typeof y === "string") {
    console.log(y.toUpperCase()) // ✓ OK, qui TypeScript sa che è string
}
```

**Regola**: per codice nuovo, preferisci `unknown` + controlli. Usa `any` solo quando non hai alternative (import di dati molto dinamici).

### Utility Types (ti salvano la vita)

TypeScript ha tipi "magici" per trasformare altri tipi:

```typescript
interface Progetto {
    id: string
    nome: string
    budget: number
    stato: string
}

// Tutti i campi opzionali (per PATCH/update parziali)
type ProgettoPartial = Partial<Progetto>
// = { id?: string; nome?: string; budget?: number; stato?: string }

// Solo alcuni campi
type ProgettoBase = Pick<Progetto, "id" | "nome">
// = { id: string; nome: string }

// Tutti tranne alcuni
type ProgettoSenzaId = Omit<Progetto, "id">
// = { nome: string; budget: number; stato: string }
```

---

## Promise e Async/Await: il ritmo del codice asincrono

Questa è forse la cosa **più diversa da Python** (a meno che tu non usi `asyncio`).

### Il problema

Molte operazioni richiedono tempo:

- Chiamate HTTP (fetch da API)
- Query al database
- Lettura di file

Se JavaScript aspettasse ogni volta, l'interfaccia si bloccherebbe. Invece, JavaScript è **asincrono**: lancia l'operazione e continua. Quando il risultato arriva, esegue una callback.

### La soluzione moderna: async/await

```typescript
// Funzione asincrona
async function caricaProgetto(id: string) {
    // await = "aspetta qui finché non arriva il risultato"
    const response = await fetch(`/api/projects/${id}`)
    const data = await response.json()
    return data
}

// Chiamata
const progetto = await caricaProgetto("123")
console.log(progetto.nome)
```

**Traduzione mentale**: `await` è come dire "ferma la funzione qui, aspetta il risultato, poi continua".

### Parallelizzare operazioni indipendenti

Se hai due operazioni che non dipendono l'una dall'altra:

```typescript
// ❌ LENTO: aspetta la prima, poi la seconda
const progetti = await fetchProgetti()
const utenti = await fetchUtenti()

// ✓ VELOCE: lancia entrambe, aspetta che finiscano
const [progetti, utenti] = await Promise.all([
    fetchProgetti(),
    fetchUtenti()
])
```

`Promise.all` è **molto comune** in Taboolo, specialmente nei dashboard che mostrano dati da più fonti.

### Error handling

```typescript
try {
    const data = await fetchData()
    // usa data...
} catch (error) {
    console.error("Errore:", error)
    // gestisci errore...
}
```

---

## Array e trasformazioni: il 90% del lavoro reale

Nel codice Taboolo lavorerai costantemente con:

- Array di voci (items)
- Trasformazioni: filtro, mappa, raggruppa
- Calcoli: somme, medie, raggruppamenti

### Map: trasforma ogni elemento

```typescript
// Python: [x * 2 for x in numeri]
const raddoppiati = numeri.map((x) => x * 2)

// Con oggetti
const nomi = progetti.map((p) => p.nome)
```

### Filter: seleziona elementi

```typescript
// Python: [x for x in numeri if x > 0]
const positivi = numeri.filter((x) => x > 0)

// Con oggetti
const attivi = progetti.filter((p) => p.stato === "attivo")
```

### Reduce: accumula in un valore

```typescript
// Python: sum(numeri)
const totale = numeri.reduce((acc, x) => acc + x, 0)

// Raggruppamento (molto usato!)
const perCategoria = voci.reduce((acc, voce) => {
    const cat = voce.categoria
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(voce)
    return acc
}, {} as Record<string, Voce[]>)
```

### Find: trova un elemento

```typescript
// Python: next((x for x in lista if x.id == "123"), None)
const trovato = lista.find((x) => x.id === "123")
// Attenzione: può essere undefined!
```

### Chaining: combinare operazioni

```typescript
const totaleVociAttive = voci
    .filter((v) => v.stato === "attivo")
    .map((v) => v.importo)
    .reduce((acc, x) => acc + x, 0)
```

---

## Moduli: come si incastra la repository

### Import/Export base

```typescript
// File: utils/math.ts
export function somma(a: number, b: number): number {
    return a + b
}

export function moltiplica(a: number, b: number): number {
    return a * b
}

// File: altro.ts
import { somma, moltiplica } from './utils/math'
const x = somma(1, 2)
```

### Export Default

Per "la cosa principale" di un file (pattern comune in Nuxt):

```typescript
// File: server/api/projects.get.ts
export default defineEventHandler(async (event) => {
    // ... logica endpoint
})
```

### Alias in Nuxt/Nitro

Vedrai import "magici" come:

```typescript
import { Project } from '#models'
import { normalizePrice } from '#utils'
```

Il `#` è un **alias** definito in `nuxt.config.ts`. Se un import ti sembra magico, guarda lì:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
    nitro: {
        alias: {
            '#models': './server/models',
            '#utils': './server/utils',
            '#services': './server/services'
        }
    }
})
```

### Auto-import Nuxt

Alcune funzioni non richiedono import esplicito:

- `useFetch`, `useRuntimeConfig`, `ref`, `computed` nel frontend
- `defineEventHandler`, `createError`, `readBody` nel backend

Nuxt le importa automaticamente. Se vedi una funzione usata senza import, probabilmente è auto-importata.

---

## Error Handling in Nitro (API)

Negli endpoint (`server/api/*`) vedrai spesso:

```typescript
export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    
    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'ID progetto richiesto'
        })
    }
    
    const progetto = await Project.findById(id)
    
    if (!progetto) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Progetto non trovato'
        })
    }
    
    return progetto
})
```

**Codici HTTP comuni**:

| Codice | Significato | Quando usarlo |
|--------|-------------|---------------|
| 400 | Bad Request | Parametri mancanti/invalidi |
| 401 | Unauthorized | Non autenticato |
| 403 | Forbidden | Non autorizzato |
| 404 | Not Found | Risorsa non esiste |
| 409 | Conflict | Duplicato, vincolo violato |
| 500 | Internal Error | Bug, database down |

---

## Esercizi pratici

### Esercizio 1: Leggi un endpoint

Apri `server/api/projects/index.get.ts` e rispondi:

1. Dove legge i query parameters?
2. Dove interroga MongoDB?
3. Dove costruisce la response JSON?

### Esercizio 2: Leggi il client API

Apri `app/lib/api-client.ts` e individua:

1. La funzione `apiFetch`
2. Come gestisce gli errori

### Esercizio 3: Normalizzazione numeri

Scrivi una funzione che:

- Prende `value: unknown`
- Ritorna `number | null`
- Accetta numeri o stringhe numeriche (anche con virgola italiana: "1.234,56")
- Ritorna `null` per tutto il resto

```typescript
function normalizeNumber(value: unknown): number | null {
    // Il tuo codice qui...
}

// Test
console.log(normalizeNumber(42))        // 42
console.log(normalizeNumber("3.14"))    // 3.14
console.log(normalizeNumber("1.234,56"))// 1234.56
console.log(normalizeNumber("abc"))     // null
console.log(normalizeNumber(null))      // null
```

Poi confronta la tua soluzione con `server/utils/normalize.ts`.

---

## Glossario rapido

| Termine | Significato |
|---------|-------------|
| **const/let** | Dichiarazione variabili (const = non riassegnabile) |
| **Arrow function** | `(x) => x * 2` — funzione anonima compatta |
| **Promise** | Oggetto che rappresenta un valore futuro |
| **async/await** | Sintassi per gestire Promise in modo leggibile |
| **Callback** | Funzione passata come argomento a un'altra funzione |
| **Type** | Annotazione che descrive la forma di un valore |
| **Interface** | Come type, ma orientata all'estensione |

---

## Risorse per approfondire

- [JavaScript.info](https://javascript.info/) — Il miglior tutorial JS gratuito, molto dettagliato
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/) — Guida ufficiale TypeScript
- [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript) — Riferimento completo
- [TypeScript Playground](https://www.typescriptlang.org/play) — Prova codice TS online

---

## Prossimi passi

Ora che conosci le basi di JavaScript e TypeScript, sei pronto per capire Vue e Nuxt!

**Prossimo capitolo:** [03 — Fondamenti Nuxt: Vue, componenti e routing](03-fondamenti-nuxt.md)

---

*Consiglio finale: se ti blocchi su qualcosa, pensa in Python. "Come farei questo con un dizionario e un ciclo for?". Poi traduci. È il modo più veloce per imparare.*
