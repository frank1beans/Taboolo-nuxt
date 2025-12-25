# 03 — Fondamenti Nuxt: Vue, Componenti e Routing

Benvenuto al terzo capitolo! Qui imparerai come funziona Vue 3 (il framework UI) e Nuxt (il meta-framework che aggiunge routing, server e convenzioni). Questa è la base per capire come sono costruite le pagine di Taboolo.

Se vieni da framework come React, Angular, o anche da backend (Flask, Django, FastAPI), questo capitolo ti mostrerà come Vue affronta gli stessi problemi in modo diverso.

**Tempo stimato:** 1.5-2 ore (con esercizi)

---

## Perché Vue e Nuxt

### Vue 3: l'essenza

Vue è un framework per costruire interfacce utente. La sua idea centrale è semplice:

> **I dati guidano la UI.** Quando i dati cambiano, la UI si aggiorna automaticamente.

In Python tradizionale, se cambi una variabile devi anche aggiornare manualmente l'HTML. In Vue, la UI "reagisce" ai cambiamenti automaticamente. Questo si chiama **reattività**.

### Nuxt 4: Vue con le batterie incluse

Nuxt aggiunge a Vue:

- **Routing automatico** basato sui file (come Next.js per React)
- **Server-Side Rendering** (SSR) opzionale
- **Backend integrato** (Nitro) nello stesso progetto
- **Auto-import** di funzioni comuni
- **Convenzioni** che riducono la configurazione

In Taboolo, Nuxt è usato in modo "full-stack": frontend E backend sono nello stesso progetto.

---

## La struttura di un componente Vue

Un file `.vue` è diviso in tre sezioni:

```vue
<script setup lang="ts">
// 1. LOGICA: TypeScript, stato, chiamate API
import { ref, computed } from 'vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)

function increment() {
    count.value += 1
}
</script>

<template>
    <!-- 2. TEMPLATE: HTML con binding -->
    <div>
        <p>Conteggio: {{ count }}</p>
        <p>Doppio: {{ doubled }}</p>
        <button @click="increment">+1</button>
    </div>
</template>

<style scoped>
/* 3. STILI: CSS (opzionale) */
button {
    padding: 8px 16px;
}
</style>
```

### Cosa significano queste parti

1. **`<script setup lang="ts">`**: qui scrivi la logica. `setup` è la sintassi moderna di Vue 3 (più concisa). `lang="ts"` abilita TypeScript.

2. **`<template>`**: qui descrivi cosa appare a schermo. È HTML con "superpoteri" (binding, direttive).

3. **`<style scoped>`**: CSS che si applica SOLO a questo componente. `scoped` evita che gli stili "escano" e influenzino altri componenti.

---

## Reattività: ref, computed, e perché esiste .value

Questo è il **concetto più importante** di Vue. Capirlo significa capire Vue.

### ref: un valore reattivo

```typescript
import { ref } from 'vue'

const nome = ref("Mario")
```

`ref()` incapsula un valore rendendolo "osservabile". Quando lo modifichi, Vue sa che deve aggiornare la UI.

**Nel codice TypeScript**, devi usare `.value`:

```typescript
console.log(nome.value)  // "Mario"
nome.value = "Luigi"     // Ora è "Luigi"
```

**Nel template**, Vue "unwrap" automaticamente i ref (non serve `.value`):

```html
<p>Ciao {{ nome }}</p>  <!-- Mostra "Mario", poi "Luigi" -->
```

### computed: valori derivati

`computed` crea un valore che dipende da altri valori reattivi. Si aggiorna automaticamente quando le dipendenze cambiano.

```typescript
const items = ref([1, 2, 3, 4, 5])
const itemCount = computed(() => items.value.length)
const total = computed(() => items.value.reduce((a, b) => a + b, 0))
```

**Analogia Python**: è come una `@property` che si ricalcola automaticamente.

### Esempio completo

```typescript
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const data = ref<Project[]>([])

// Questi si aggiornano automaticamente quando status cambia
const isLoading = computed(() => status.value === 'loading')
const isEmpty = computed(() => data.value.length === 0)
const hasError = computed(() => status.value === 'error')
```

Nel template:

```html
<div v-if="isLoading">Caricamento...</div>
<div v-else-if="hasError">Errore!</div>
<div v-else-if="isEmpty">Nessun dato</div>
<ul v-else>
    <li v-for="project in data" :key="project.id">
        {{ project.name }}
    </li>
</ul>
```

---

## Il Template: come i dati diventano UI

### Interpolazione: mostrare valori

```html
<p>Benvenuto, {{ userName }}</p>
<p>Totale: {{ total.toFixed(2) }} €</p>
```

Le doppie graffe `{{ }}` mostrano il valore di una variabile. Puoi anche usare espressioni semplici.

### Binding di attributi: `:attributo`

```html
<!-- Senza binding: href è letteralmente "url" -->
<a href="url">Link</a>

<!-- Con binding: href è il VALORE della variabile url -->
<a :href="url">Link</a>

<!-- Altri esempi -->
<img :src="imageUrl" :alt="imageDescription">
<button :disabled="isLoading">Salva</button>
<div :class="{ active: isActive, error: hasError }">...</div>
```

I due punti `:` sono l'abbreviazione di `v-bind:`.

### Event handlers: `@evento`

```html
<button @click="handleClick">Cliccami</button>
<input @input="onInput" @keyup.enter="submit">
<form @submit.prevent="handleSubmit">...</form>
```

La chiocciola `@` è l'abbreviazione di `v-on:`. I modificatori come `.prevent` evitano il comportamento default (in questo caso, il refresh della pagina).

### Direttive fondamentali

**v-if / v-else**: rendering condizionale

```html
<div v-if="isLoggedIn">Benvenuto!</div>
<div v-else>Effettua il login</div>
```

**v-for**: loop

```html
<ul>
    <li v-for="item in items" :key="item.id">
        {{ item.name }} - {{ item.price }} €
    </li>
</ul>
```

> ⚠️ **Sempre** aggiungi `:key` con un identificatore unico. Vue lo usa per ottimizzare gli aggiornamenti.

**v-model**: binding bidirezionale

```html
<input v-model="searchQuery" placeholder="Cerca...">
<!-- searchQuery si aggiorna quando l'utente digita -->
<!-- e l'input mostra sempre il valore di searchQuery -->
```

`v-model` è l'equivalente Vue di un input controllato in React.

---

## Props, Emits, Slots: le tre porte di un componente

I componenti comunicano in tre direzioni:

### Props: dati dal parent al child

```typescript
// Nel componente figlio
const props = defineProps<{
    projectId: string
    showDetails?: boolean  // opzionale
}>()

// Uso nel template del figlio
<p>Progetto: {{ projectId }}</p>
```

```html
<!-- Nel componente parent -->
<ProjectCard 
    :projectId="project.id" 
    :showDetails="true" 
/>
```

### Emits: eventi dal child al parent

```typescript
// Nel componente figlio
const emit = defineEmits<{
    close: []  // evento senza payload
    save: [data: Project]  // evento con payload
}>()

// Quando vuoi emettere
function handleSave() {
    emit('save', projectData)
}
```

```html
<!-- Nel parent -->
<ProjectModal 
    @close="showModal = false" 
    @save="handleProjectSaved" 
/>
```

### Slots: contenuto iniettato

Gli slot permettono al parent di "iniettare" contenuto nel child.

```vue
<!-- Componente Card.vue -->
<template>
    <div class="card">
        <div class="card-header">
            <slot name="header">Titolo Default</slot>
        </div>
        <div class="card-body">
            <slot>Contenuto default</slot>
        </div>
    </div>
</template>
```

```html
<!-- Uso -->
<Card>
    <template #header>
        <h2>Il mio titolo custom</h2>
    </template>
    
    <p>Questo va nel body della card.</p>
</Card>
```

In Taboolo, `DataGridPage.vue` usa slot per header, azioni e sidebar.

---

## Lifecycle Hooks: quando eseguire codice

Vue ha "momenti" nel ciclo di vita di un componente dove puoi intervenire:

```typescript
import { onMounted, onBeforeUnmount } from 'vue'

onMounted(() => {
    // Eseguito DOPO che il componente è nel DOM
    console.log("Componente montato")
    
    // Esempio: inizializza una libreria che richiede il DOM
    initChart(document.getElementById('chart'))
})

onBeforeUnmount(() => {
    // Eseguito PRIMA che il componente venga rimosso
    console.log("Pulizia...")
    
    // Esempio: rimuovi event listeners
    window.removeEventListener('resize', handleResize)
})
```

### Attenzione a client vs server

In Nuxt, il codice può girare sia sul server (SSR) che sul client. `onMounted` gira **solo sul client** perché il DOM esiste solo lì.

Se accedi a `window`, `document`, o `localStorage`, fallo dentro `onMounted`:

```typescript
// ❌ ERRORE: window is not defined (sul server)
const width = window.innerWidth

// ✓ CORRETTO
onMounted(() => {
    const width = window.innerWidth
})
```

---

## Watchers: reagire ai cambiamenti

Mentre `computed` calcola valori derivati, `watch` esegue **side effects** quando qualcosa cambia.

### watch: osserva una sorgente specifica

```typescript
import { watch } from 'vue'

const searchQuery = ref('')

watch(searchQuery, (newValue, oldValue) => {
    console.log(`Query cambiata da "${oldValue}" a "${newValue}"`)
    // Esempio: chiama API di ricerca
    fetchSearchResults(newValue)
})
```

### watch con opzioni

```typescript
watch(
    searchQuery,
    async (newValue) => {
        await fetchSearchResults(newValue)
    },
    {
        immediate: true,  // esegui subito, non solo al cambiamento
        debounce: 300     // aspetta 300ms di inattività prima di eseguire
    }
)
```

### watchEffect: osserva tutto ciò che leggi

```typescript
import { watchEffect } from 'vue'

watchEffect(() => {
    // Vue traccia automaticamente tutte le dipendenze lette
    console.log(`Filtri: ${selectedRound.value}, ${selectedCompany.value}`)
    // Si riesegue quando selectedRound O selectedCompany cambiano
})
```

**Regola pratica**: preferisci `watch` esplicito quando vuoi controllo preciso su cosa innesca cosa.

---

## Composables: la chiave per scalare il frontend

Un **composable** è una funzione `useXxx()` che incapsula stato e logica riusabile.

### Esempio: useCounter

```typescript
// composables/useCounter.ts
export function useCounter(initialValue = 0) {
    const count = ref(initialValue)
    
    function increment() {
        count.value++
    }
    
    function decrement() {
        count.value--
    }
    
    function reset() {
        count.value = initialValue
    }
    
    return {
        count: readonly(count),  // esponi come readonly
        increment,
        decrement,
        reset
    }
}
```

```vue
<!-- Uso nel componente -->
<script setup>
const { count, increment, decrement } = useCounter(10)
</script>

<template>
    <button @click="decrement">-</button>
    <span>{{ count }}</span>
    <button @click="increment">+</button>
</template>
```

### Composables in Taboolo

La cartella `app/composables/` contiene logica riusabile:

- `useCurrentContext.ts`: contesto progetto/preventivo corrente
- `useWbsTree.ts`: albero WBS e filtro per prefisso
- `useDataGrid*.ts`: logica comune per AG Grid
- `useSemanticMap.ts`: dati per la mappa semantica

### Pattern: state + actions

Un buon composable espone:

- **State**: refs/computed (cosa mostrare)
- **Actions**: funzioni che mutano lo state o chiamano API (cosa fare)

```typescript
export function useProjects() {
    // STATE
    const projects = ref<Project[]>([])
    const status = ref<'idle' | 'loading' | 'error'>('idle')
    const error = ref<string | null>(null)
    
    // COMPUTED
    const isLoading = computed(() => status.value === 'loading')
    const isEmpty = computed(() => projects.value.length === 0)
    
    // ACTIONS
    async function fetchProjects() {
        status.value = 'loading'
        try {
            projects.value = await $fetch('/api/projects')
            status.value = 'idle'
        } catch (e) {
            error.value = e.message
            status.value = 'error'
        }
    }
    
    async function deleteProject(id: string) {
        await $fetch(`/api/projects/${id}`, { method: 'DELETE' })
        projects.value = projects.value.filter(p => p.id !== id)
    }
    
    return {
        projects: readonly(projects),
        isLoading,
        isEmpty,
        error,
        fetchProjects,
        deleteProject
    }
}
```

---

## Nuxt: Routing automatico

### La convenzione dei file

Nuxt genera le route dai file in `app/pages/`:

| File | Route |
|------|-------|
| `pages/index.vue` | `/` |
| `pages/about.vue` | `/about` |
| `pages/projects/index.vue` | `/projects` |
| `pages/projects/new.vue` | `/projects/new` |
| `pages/projects/[id].vue` | `/projects/:id` (dinamico) |
| `pages/projects/[id]/edit.vue` | `/projects/:id/edit` |

Le parentesi quadre `[id]` indicano parametri dinamici.

### Leggere i parametri

```typescript
const route = useRoute()

// Per /projects/123
const projectId = route.params.id  // "123"

// Per /search?q=test&page=2
const query = route.query.q        // "test"
const page = route.query.page      // "2"
```

### Navigazione

```typescript
const router = useRouter()

// Navigazione programmatica
router.push('/projects')
router.push({ path: '/projects', query: { filter: 'active' } })
router.back()
```

Nel template:

```html
<NuxtLink to="/projects">Vai ai Progetti</NuxtLink>
<NuxtLink :to="{ path: '/projects', query: { filter: 'active' } }">
    Progetti Attivi
</NuxtLink>
```

---

## Nuxt: Layout

Un **layout** è un "guscio" riutilizzabile intorno alle pagine.

### Definire un layout

```vue
<!-- layouts/default.vue -->
<template>
    <div class="layout">
        <AppHeader />
        <main>
            <slot />  <!-- Qui viene renderizzata la pagina -->
        </main>
        <AppFooter />
    </div>
</template>
```

### Usare un layout specifico

```vue
<!-- pages/dashboard.vue -->
<script setup>
definePageMeta({
    layout: 'sidebar'  // usa layouts/sidebar.vue
})
</script>
```

### Layout in Taboolo

- `layouts/default.vue`: layout base
- `layouts/SidebarLayout.vue`: layout con sidebar WBS

---

## Nuxt: Data Fetching

### useFetch: il modo Nuxt

```typescript
const { data, status, error, refresh } = await useFetch('/api/projects')
```

`useFetch`:
- Esegue la fetch sia sul server (SSR) che sul client
- Deduplica le richieste
- Gestisce loading/error automaticamente

### $fetch: per chiamate manuali

```typescript
// Per chiamate in event handlers
async function handleSubmit() {
    const result = await $fetch('/api/projects', {
        method: 'POST',
        body: formData
    })
}
```

---

## Nuxt: Server (Nitro)

In Taboolo, il backend è nella cartella `server/`:

```
server/
├── api/                # Endpoint REST
│   ├── projects/
│   │   ├── index.get.ts    # GET /api/projects
│   │   ├── index.post.ts   # POST /api/projects
│   │   └── [id].get.ts     # GET /api/projects/:id
├── models/             # Schemi Mongoose
├── services/           # Logica applicativa
├── utils/              # Utility
└── plugins/
    └── mongoose.ts     # Connessione DB
```

### Esempio endpoint

```typescript
// server/api/projects/index.get.ts
export default defineEventHandler(async (event) => {
    // Leggi query params
    const query = getQuery(event)
    
    // Query database
    const projects = await Project.find({
        status: query.status || undefined
    }).lean()
    
    // Ritorna JSON
    return projects
})
```

### Alias Nitro

In `nuxt.config.ts` sono definiti alias:

```typescript
nitro: {
    alias: {
        '#models': './server/models',
        '#services': './server/services',
        '#utils': './server/utils'
    }
}
```

Così puoi scrivere:

```typescript
import { Project } from '#models'
import { upsertEstimate } from '#services'
```

---

## Esercizi pratici

### Esercizio 1: Seguire un flusso pagina

Apri `app/pages/projects/index.vue` e rispondi:

1. Come carica la lista progetti?
2. Dove definisce le colonne della griglia?
3. Cosa succede quando clicchi su un progetto?

### Esercizio 2: Esplorare un composable

Apri `app/composables/useWbsTree.ts` e rispondi:

1. Cosa restituisce?
2. Come costruisce l'albero?
3. Come filtra quando selezioni un nodo?

### Esercizio 3: Capire un layout

Apri `app/layouts/default.vue` e individua:

1. Dove viene renderizzata la pagina (slot)
2. Quali componenti sono sempre visibili

### Esercizio 4: Leggere un endpoint

Apri `server/api/projects/index.get.ts` e individua:

1. Come legge i parametri dalla query string
2. Come interroga MongoDB
3. Come costruisce la risposta

---

## Risorse per approfondire

- [Documentazione Vue 3](https://vuejs.org/guide/introduction.html) — Guida ufficiale
- [Documentazione Nuxt](https://nuxt.com/docs) — Tutto su Nuxt
- [Vue School](https://vueschool.io/) — Video corsi (alcuni gratuiti)
- [VueUse](https://vueuse.org/) — Collezione di composables utili

---

## Prossimi passi

Ora che conosci Vue e Nuxt, sei pronto per esplorare l'architettura specifica di Taboolo!

**Prossimo capitolo:** [04 — Architettura Taboolo](04-architettura.md)

---

*Ricorda: la reattività è la chiave di tutto. Se capisci come `ref` e `computed` funzionano, il resto viene naturale.*
