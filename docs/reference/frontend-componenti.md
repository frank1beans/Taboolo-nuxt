# 09 — Frontend: pagine e componenti

Questa sezione descrive la struttura frontend (Nuxt) e i componenti più importanti per la UX.

## 9.1 — Pagine (routes) principali

Fonte: `app/pages/`

- `/` → redirect a `/projects` (`app/pages/index.vue`)
- `/projects` → elenco progetti (`app/pages/projects/index.vue`)
- `/projects/:id` → dashboard progetto (lista preventivi) (`app/pages/projects/[id]/index.vue`)
- `/projects/:id/import` → import computo + offerte (`app/pages/projects/[id]/import/index.vue`)
- `/projects/:id/pricelist` → listino per estimate (`app/pages/projects/[id]/pricelist/index.vue`)
- `/projects/:id/estimate/:estimateId` → shell + dashboard preventivo (`app/pages/projects/[id]/estimate/[estimateId]/index.vue`)
- `/projects/:id/estimate/:estimateId/detail` → voci baseline (`app/pages/projects/[id]/estimate/[estimateId]/detail.vue`)
- `/projects/:id/estimate/:estimateId/offer` → voci offerta (`app/pages/projects/[id]/estimate/[estimateId]/offer.vue`)
- `/projects/:id/estimate/:estimateId/comparison` → confronto (`app/pages/projects/[id]/estimate/[estimateId]/comparison.vue`)

Nota: esiste anche `/catalogs` ma al momento è placeholder (`app/pages/catalogs/index.vue`).

## 9.2 — Componenti chiave

### `DataGridPage`

File: `app/components/layout/DataGridPage.vue` (usato in molte pagine)

Responsabilità:

- layout con header (titolo/sottotitolo/actions)
- integrazione griglia + toolbar + stato loading/empty
- slot sidebar (es. WBS)

### `EstimateItemsPage`

File: `app/components/estimates/EstimateItemsPage.vue`

Responsabilità:

- wrapper condiviso per:
  - dettaglio preventivo (baseline)
  - dettaglio offerta (query round/company)
- fetching:
  - `GET /api/projects/:id/estimate/:estimateId`
  - `GET /api/projects/:id/estimate/:estimateId/items` (con query)
- filtro WBS (via `useWbsTree`)
- calcolo totale (via grid api / fallback su dati filtrati)

### `ImportWizard`

File: `app/components/projects/ImportWizard.vue`

Responsabilità:

- procedura guidata import offerte Excel:
  - selezione baseline
  - selezione file e foglio
  - mapping colonne
  - invio a `api.uploadBidOffer`

## 9.3 — Composables importanti

### `useCurrentContext`

File: `app/composables/useCurrentContext.ts`

Scopo:

- tenere in memoria:
  - progetto corrente
  - estimate corrente
- persistere su API:
  - `GET/PUT /api/context/current`
- ripristino lato client (storage) se API non disponibile

### `useWbsTree`

File: `app/composables/useWbsTree.ts`

Scopo:

- costruire un albero WBS a partire dai dati delle righe (campo `wbs_hierarchy`)
- filtrare i dati per prefisso (selezione nodo)

Nota:

- in alcune viste (listino/confronto) viene passata una funzione `getLevels` per usare WBS6/WBS7.

## 9.4 — Componenti DataGrid (sottocomponenti)

La cartella `app/components/data-grid/` contiene diversi sottocomponenti specializzati:

### `StatusBadgeRenderer.vue`

Cell renderer per AG Grid che mostra badge colorati in base allo stato.

Props ricevute (via `params`):
- `value`: stringa dello stato (es. `setup`, `active`, `completed`)

Logica: mappa ogni stato a un colore badge (es. `setup` → warning, `active` → primary).

### `DataGridToolbar.vue`

Toolbar sopra la griglia con:
- Input ricerca (quick filter)
- Bottone visibilità colonne (`ColumnVisibilityPopover`)
- Bottone export
- Slot per azioni custom

### `DataGridEmptyState.vue`

Placeholder mostrato quando `rowData` è vuoto.

Props:
- `title`: titolo empty state
- `message`: messaggio descrittivo

### `DataGridLoadingSkeleton.vue`

Skeleton loader mostrato durante il caricamento dati.

### `DataGridActions.vue`

Componente per azioni contestuali (es. bottoni nella toolbar).

### `ColumnVisibilityPopover.vue`

Popover che permette di mostrare/nascondere colonne.

Features:
- Ricerca colonne
- Toggle individuale
- Raggruppamento per `headerName` (per colonne con stesso nome)

### `ColumnVisibilityConfig.vue`

Configurazione visibilità colonne (variante inline).

### `ColumnFilterPopover.vue`

Popover per filtri avanzati su colonna singola.

Features:
- Operatori: `contains`, `equals`, `startsWith`, `endsWith`, `greaterThan`, `lessThan`
- Supporto numerico e testuale
- Chips per filtri attivi
