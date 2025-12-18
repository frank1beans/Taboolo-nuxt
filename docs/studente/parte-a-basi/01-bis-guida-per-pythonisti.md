# 01-bis - Guida per Pythonisti: Capire Taboolo (Nuxt/TS/Mongo)

Questa guida è scritta specificamente per chi **conosce Python** (anche solo basi/scripting) e si trova davanti a un progetto full-stack TypeScript/Nuxt generato dall'AI.

L'obiettivo è usare quello che sai già (Python) per decodificare quello che vedi (TS/Vue).

## 1. La Pietra di Rosetta: Sintassi JS/TS vs Python

JavaScript moderno (e TypeScript) è molto più simile a Python di quanto sembri.

| Concetto | Python | TypeScript/JS | Note |
| :--- | :--- | :--- | :--- |
| **Variabili** | `x = 10` | `const x = 10` (o `let`) | Usa `const` per default (come se fosse immutabile), `let` se devi cambiarla. |
| **Dizionari** | `d = {"a": 1, "b": 2}` | `const d = { a: 1, b: 2 }` | Le chiavi non richiedono virgolette se semplici. Si accede con `d.a` (dot notation). |
| **Liste** | `l = [1, 2, 3]` | `const l = [1, 2, 3]` | Identico. |
| **Funzioni** | `def somma(a, b): return a+b` | `function somma(a, b) { return a+b }` | Le graffe `{}` delimitano il blocco (al posto dell'indentazione). |
| **Lambda** | `lambda x: x * 2` | `(x) => x * 2` | Si chiamano "Arrow Functions". Usatissime. |
| **Stringhe f** | `f"Ciao {nome}"` | \`Ciao ${nome}\` | Si usano i backticks (\`) invece delle virgolette. |
| **Import** | `from lib import func` | `import { func } from 'lib'` | Sintassi molto simile. |
| **Debug** | `print(x)` | `console.log(x)` | |

### Il concetto di "Tipizzazione" (TypeScript vs Python Hints)

In Python moderno usi i type hints:

```python
def process(name: str) -> dict: ...
```

In TypeScript è **identico**, ma il controllo è più rigido e avviene prima di eseguire il codice:

```ts
function process(name: string): Record<string, any> { ... }
```

**Non spaventarti dei tipi:** servono all'AI per non scrivere codice che rompe tutto. Se vedi `interface User { ... }`, è come una `dataclass` o un `TypedDict` in Python.

## 2. Nuxt spiegato con analogie (Django/FastAPI)

Nuxt è un framework "full-stack". Immaginalo come se avessi **FastAPI** (backend) e **Jinja2** (frontend) fusi insieme, ma il frontend è interattivo.

### Struttura cartelle

*   **`server/api/`** -> Sono le tue **Views/Routes** di FastAPI/Flask.
    *   File: `server/api/projects.get.ts`
    *   Python eq: `@app.get("/projects") def get_projects(): ...`
    *   Questo codice gira **sul server**.

*   **`app/pages/`** -> Sono i tuoi **Template HTML**.
    *   File: `app/pages/projects/index.vue`
    *   Python eq: `templates/projects.html` (ma molto più potente).
    *   Questo codice gira **nel browser** dell'utente.

### "Reattività" (La magia che Python non ha di base)

In Python, se cambi una variabile `x = 10` -> `x = 20`, la pagina HTML non cambia finché non ricarichi.
In Vue (Nuxt), se cambi una variabile "reattiva" (`ref`), la pagina si aggiorna all'istante da sola.

```ts
// Script
const count = ref(0) // Comincia a 0

function increment() {
  count.value += 1   // In Python sarebbe count += 1
}
```

```html
<!-- Template -->
<button @click="increment">{{ count }}</button>
```

Se clicchi, il numero cambia. Non devi dire "aggiorna l'HTML". Questo è il cuore di Framework come Vue/React.

## 3. MongoDB per chi conosce i Dict Python

Dimentica le tabelle SQL e i JOIN complessi.

*   **Collection (Tabella)** = Una lista di dizionari Python.
*   **Document (Riga)** = Un dizionario Python (`dict`).

Esempio di documento Mongo (JSON):

```json
{
  "_id": "ObjectId('...')",
  "name": "Progetto Alpha",
  "budget": 10000,
  "tags": ["urgente", "2024"]  // Puoi avere liste dentro il record!
}
```

In Python (tramite librerie come PyMongo) o in TS (via Mongoose), lavori quasi sempre con oggetti che sembrano **dizionari annidati**.

### Mongoose (l'ORM)
Mongoose è come **SQLAlchemy** o **Pydantic**: definisce la "forma" che i dizionari devono avere per non fare pasticci.

## 4. Come leggere il codice generato dall'AI

Visto che l'app l'ha scritta l'AI, troverai dei pattern ricorrenti.

### 1. Il pattern "Fetch Data"
In quasi ogni pagina (`.vue`), vedrai:

```ts
const { data, status } = await useFetch('/api/projects/123')
```

**Traduzione Python:**
"Fai una `requests.get('/api/projects/123')`, metti il risultato in `data` e dimmi se sta caricando in `status`."

### 2. Il pattern "DataGrid"
L'app usa griglie (Excel-like). L'AI configura le colonne così:

```ts
{ field: 'price', headerName: 'Prezzo', valueFormatter: ... }
```

È come configurare le colonne di un **DataFrame Pandas** per la visualizzazione. Stai dicendo: "Prendi la chiave `price` dal dizionario e mostrala col titolo 'Prezzo'".

## 5. Dove mettere le mani (senza rompere tutto)

Se vuoi fare piccole modifiche:

1.  **Cambiare un testo o un colore:**
    *   Vai in `app/pages/...`. Cerca il testo. È HTML standard (o quasi).
    *   Le classi CSS (es. `text-red-500`) sono Tailwind. `text-red-500` è letteralmente "fai il testo rosso".

2.  **Cambiare una logica di calcolo (es. totale):**
    *   Cerca file chiamati `...Service.ts` o nel backend (`server/api/...`).
    *   Lì la logica è procedurale, molto simile a Python.

3.  **Debuggare:**
    *   Invece di `print()`, scrivi `console.log("Valore:", variabile)`.
    *   Se il codice è nel backend (Server terminal), lo vedi nel terminale dove hai lanciato `pnpm dev`.
    *   Se è nel frontend, lo vedi nel browser -> Tasto Destro -> Ispeziona -> Console.

## 6. Glossario Rapido

*   **Promise / Await**: In JS tutto quello che richiede tempo (DB, API) è "Async". Devi mettere `await` davanti, altrimenti il programma prosegue senza aspettare il risultato.
*   **Componente**: Un pezzo di UI riutilizzabile (es. un Bottone, una Sidebar). È come una funzione che ritorna HTML.
*   **Props**: I parametri passati a un Componente (come gli argomenti di una funzione Python).
*   **Nitro**: Il server web che fa girare le API.
*   **Pnpm**: Il `pip` di Javascript. Installa i pacchetti.

---
**Consiglio finale:**
Se ti blocchi, pensa in Python: "Come farei questo con un dizionario e un ciclo for?". Poi chiedi all'AI: "Traduci questo loop Python in TypeScript per la mia app". È il modo più veloce per imparare.
