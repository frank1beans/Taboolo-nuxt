# 03 - Vue 3 (Composition API) per leggere e scrivere la UI

Obiettivo: capire come sono fatte le pagine Nuxt (componenti Vue) in questa repo, e soprattutto come ragionare quando devi cambiare una UI basata su griglie, filtri e wizard.

Se parti da zero assoluto: concentrati su 5 concetti. Se li capisci, puoi già lavorare sulla maggior parte del frontend Taboolo:

1) template e binding
2) reattività (ref/computed)
3) props/emits/slots
4) composables
5) watch (sincronizzare filtri e URL)

## 03.1 - Componente Vue: template + script setup

Un file `.vue` tipico ha:

- `<script setup lang="ts">`: logica (TypeScript), stato, chiamate API
- `<template>`: markup e binding (come i dati vanno a schermo)

Esempi introduttivi:

- `app/pages/index.vue` (redirect)
- `app/pages/projects/index.vue` (lista progetti)

Nel `script setup` scrivi codice TypeScript, ma con reattività Vue.

## 03.2 - Template: come i dati diventano UI

Tre sintassi base:

- interpolazione: `{{ title }}`
- binding attributi: `:disabled="loading"`
- eventi: `@click="doSomething()"`

Direttive fondamentali:

- `v-if` / `v-else`: mostra/nascondi
- `v-for="item in items"`: liste
- `v-model`: due vie (input, select, filtri)

Regola d'oro: il template deve restare "semplice". La logica vera sta nel `script setup` o, meglio, in un composable.

## 03.3 - Reattività: `ref`, `computed`, e perché esiste `.value`

In Vue 3 hai due strumenti principali:

- `ref(...)`: un valore reattivo "singolo"
- `computed(() => ...)`: valore derivato, ricalcolato quando cambiano le dipendenze

Esempio:

```ts
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const loading = computed(() => status.value === 'pending')
```

Perché `status.value`?

- `ref` incapsula il valore per renderlo osservabile
- nel template, Vue "unwrap" automaticamente i `ref` (quindi `loading` si usa senza `.value`)

### 03.3.1 - `reactive` (quando serve)

`reactive({ ... })` rende reattivo un oggetto intero.

Regola pratica:

- usa `ref` per valori semplici e per evitare sorprese
- usa `reactive` per oggetti di form complessi, ma fai attenzione a destrutturare (perdi reattività)

Se devi destrutturare un `reactive`, usa `toRefs`.

## 03.4 - Props, emits, slots: le tre "porte" di un componente

Un componente comunica in tre direzioni:

- props: dati in ingresso (dal parent)
- emits: eventi in uscita (verso il parent)
- slots: contenuto iniettato (layout componibile)

Esempio tipico:

```ts
const props = defineProps<{ projectId: string }>()
const emit = defineEmits<{ close: []; success: [payload: unknown] }>()
```

In Taboolo:

- `app/components/layout/DataGridPage.vue` usa slot per header/azioni/sidebar
- i wizard (import) emettono eventi tipo `success` e `close`

### 03.4.1 - Pattern utile: "presentational vs container"

Quando una pagina cresce, separa:

- container: fa fetch, gestisce stato, parla con API (spesso la pagina)
- presentational: riceve props e rende UI (componenti riusabili)

Questo rende la UI più riusabile e più facile da mantenere.

## 03.5 - Lifecycle: quando scrivere `onMounted`

Nel `script setup` puoi usare hook come:

- `onMounted(() => { ... })`: dopo il mount sul client
- `onBeforeUnmount(() => { ... })`: cleanup (event listeners, timer)

In una app Nuxt chiediti: "questa cosa deve girare solo sul client?".

Esempi tipici di logica client-only:

- accesso a `window` / `localStorage`
- inizializzazione AG Grid (spesso tramite plugin client)

## 03.6 - Watchers: sincronizzare filtri, URL e fetch

`watch(...)` serve per reagire a cambiamenti.

Esempi reali in questo progetto:

- quando cambiano filtri (round/impresa), aggiorno la URL e ricarico dati
- quando cambia `estimateId`, ricarico righe e WBS

Differenza:

- `watch(source, callback)`: reagisce a una sorgente specifica
- `watchEffect(() => { ... })`: reagisce a qualunque dipendenza letta dentro

Regola pratica: preferisci `watch` quando vuoi controllare bene cosa innesca cosa.

## 03.7 - Composables: la chiave per scalare il frontend

Un composable è una funzione `useXxx()` che incapsula stato e logica riusabile.

Esempi in Taboolo:

- `app/composables/useCurrentContext.ts`: contesto progetto/preventivo corrente
- `app/composables/useWbsTree.ts`: albero WBS e filtro per prefisso
- `app/composables/useDataGrid*.ts`: logica comune per AG Grid (colonne, filtri, export)

### 03.7.1 - Pattern: "state + actions"

Un buon composable espone:

- state (refs/computed)
- actions (funzioni che mutano lo state o chiamano API)

Esempio mentale:

- state: `selectedWbs`, `loading`, `rows`
- actions: `setSelectedWbs`, `reload`, `exportCsv`

### 03.7.2 - Quando usare Pinia invece di un composable

In questa repo Pinia c'è (cartella `app/stores/`), ma molte cose stanno nei composables.

Regola pratica:

- composable: stato locale a una pagina o a un flusso (wizard)
- store Pinia: stato globale condiviso tra molte aree (filtri globali, UI state, caching più ampio)

## 03.8 - Esercizi guidati (leggere codice vero)

1) Apri `app/components/estimates/EstimateItemsPage.vue` e segui il flusso:
   - prende parametri route
   - chiama API (via `useFetch` o `app/lib/api-client.ts`)
   - inizializza la griglia e i totali
2) Apri `app/composables/useWbsTree.ts` e rispondi:
   - come costruisce l'albero dai `wbs_levels`/`wbs_hierarchy`?
   - come filtra le righe quando selezioni un nodo?
3) Apri `app/components/layout/DataGridPage.vue` e trova:
   - dove entra la sidebar (slot)
   - dove entra la toolbar

## 03.9 - Micro-progetto: un componente Counter (ma fatto bene)

Scopo: praticare `ref`, `computed`, `props`, `emits`.

1) Crea `Counter.vue` con:
   - prop `initialValue: number`
   - pulsanti `+` e `-`
   - emit `update:value` a ogni modifica
2) Usalo in una pagina di prova e verifica:
   - il parent riceve gli eventi
   - il template si aggiorna senza manual refresh

Questo esercizio "banale" è la base di pattern più grandi (wizard, modali, filtri, toolbar).
