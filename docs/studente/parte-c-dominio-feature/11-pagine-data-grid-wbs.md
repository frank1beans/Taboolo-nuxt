# 11 - Pagine "a griglia": DataGrid, filtri, totale, WBS (UX core)

Obiettivo: capire come la UI costruisce le griglie e perché il filtro WBS è un composable, così da poter:

- aggiungere colonne in modo consistente
- aggiungere filtri senza duplicare logica
- calcolare totali corretti (coerenti con ciò che l'utente vede)

In Taboolo quasi tutte le feature importanti sono:

- una pagina con una tabella (DataGrid)
- un set di filtri (search, round/company, WBS, status)
- un totale calcolato sulle righe visibili

## 11.1 - Pattern standard: fetch -> grid -> filtri -> totale

Molte pagine seguono questo schema:

1) leggono parametri dalla route (`useRoute`)
2) caricano dati (via `app/lib/api-client.ts` o `useFetch`)
3) definiscono colonne con un composable (`use...GridConfig`)
4) renderizzano una DataGrid dentro `DataGridPage`
5) applicano filtro WBS con `useWbsTree`
6) calcolano il totale sulle righe filtrate

Componenti chiave:

- `app/components/layout/DataGridPage.vue`
- `app/components/data-grid/DataGrid.vue`
- `app/components/estimates/EstimateItemsPage.vue`
- `app/components/wbs/WbsSidebar.vue`

Collegamento: panoramica architettura frontend in `docs/studente/parte-d-approfondimenti/18-frontend-architettura-data-layer.md`.

## 11.2 - Perché esiste `DataGridPage`

`DataGridPage` è un "page shell" riutilizzabile che standardizza:

- titolo e sottotitolo
- toolbar (ricerca, azioni)
- stato loading
- empty state
- export (se attivo)
- sidebar opzionale (slot) per WBS o altri filtri

Vantaggio:

- ogni pagina non deve reinventare layout e UX base
- le pagine restano più piccole: meno boilerplate, meno bug

Esempi di utilizzo:

- `app/pages/projects/index.vue` (lista progetti)
- `app/pages/projects/[id]/index.vue` (dashboard progetto)

### API principale (Props utili)

Quando usi `DataGridPage`, hai a disposizione queste props per controllare la UX senza scrivere HTML custom:

- **`title`** / **`subtitle`**: Intestazione pagina.
- **`loading`**: Mostra/nasconde lo scheleton loader.
- **`toolbarPlaceholder`**: Placeholder per la barra di ricerca (default: "Cerca...").
- **`exportFilename`**: Nome file per l'export Excel (se abilitato).
- **`emptyStateTitle`** / **`emptyStateMessage`**: Cosa mostrare se non ci sono dati.
- **`gridHeight`**: Altezza CSS della griglia (default: `calc(100vh - 240px)`).

## 11.3 - `DataGrid.vue`: wrapper su AG Grid

AG Grid è potente ma verboso. Per questo la repo ha un wrapper:

- `app/components/data-grid/DataGrid.vue`

Responsabilità tipiche del wrapper:

- ricevere `rowData` e `columnDefs`
- applicare defaultColDef coerente
- gestire loading overlay / no-rows overlay
- esporre API grid (per export e calcoli)

Quando devi modificare:

- comportamento base della griglia -> vai qui
- colonne di una pagina -> vai nei composables di config

## 11.4 - Config delle colonne: i composables `use...GridConfig`

Invece di scrivere colonne inline in ogni pagina, Taboolo usa composables dedicati:

- `app/composables/projects/useProjectGridConfig.ts`
- `app/composables/estimates/useEstimateGridConfig.ts`
- `app/composables/estimates/usePriceListGridConfig.ts`

Vantaggi:

- riuso tra pagine (detail/offerta condividono colonne)
- coerenza delle etichette e formattazioni
- manutenzione: una modifica si propaga

Regola pratica:

- se aggiungi un campo di dominio nuovo (es. `revisione_offerta`), aggiungi la colonna nella config, non in pagina.

## 11.5 - Filtri: search, chips, modali, stato

I filtri nella UI possono vivere in più posti:

- local state della pagina (se è specifico)
- store Pinia (se è globale o cross-page)
- composables DataGrid (se è un filtro generico sulla griglia)

Componenti che supportano la UX:

- `app/components/data-grid/DataGridFilterChips.vue`
- `app/components/data-grid/DataGridFilterModal.vue`
- `app/components/data-grid/ColumnFilterPopover.vue`

La regola è: un filtro deve essere sempre visibile in qualche forma (chips o indicatori), altrimenti l'utente "non capisce perché i numeri non tornano".

## 11.6 - WBS: la sidebar che filtra tutto

La WBS è centrale nel dominio e nella UX.

Il pattern Taboolo:

- costruire un albero WBS (sidebar)
- usare la selezione WBS per filtrare le righe in griglia
- ricalcolare il totale sulle righe filtrate

File:

- composable: `app/composables/useWbsTree.ts`
- componenti: `app/components/wbs/WbsSidebar.vue`, `WbsTree.vue`, nodi

### 11.6.1 - Come costruisce l'albero (concettualmente)

Per ogni riga:

1) estrae livelli WBS (wbs01..wbs07 o subset)
2) costruisce una path gerarchica
3) deduplica nodi (map)
4) collega parent -> children
5) ordina

### 11.6.2 - Default levels vs custom levels

Default:

- usa `wbs_hierarchy.wbs01..wbs07`

Custom:

- alcune viste (listino/confronto) usano solo WBS6/WBS7 o livelli specifici
- in quel caso si passa una funzione `getLevels` al composable

Esempio: `app/pages/projects/[id]/pricelist/index.vue`.

## 11.7 - Totale: due strategie (e perché sono diverse)

Nel dettaglio voci (`EstimateItemsPage`) il totale può essere calcolato in due modi:

1) somma su `filteredRowData` (dati in memoria)
2) somma su ciò che la grid considera "visibile" dopo filtri/sort (API AG Grid)

Perché esistono entrambe:

- se la griglia ha filtri complessi o quick filter, la grid è la fonte di verità "visiva"
- se vuoi un totale coerente con WBS e con filtri applicati fuori dalla grid, puoi sommare i dati filtrati

File: `app/components/estimates/EstimateItemsPage.vue`.

Regola: il totale deve corrispondere a quello che l'utente vede, altrimenti perdi fiducia.

## 11.8 - Performance: cosa evitare con griglie grandi

Con migliaia di righe:

- evita computed che ricreano array enormi ad ogni re-render
- evita watchers troppo aggressivi che rifanno fetch inutili
- preferisci `lean()` e payload compatti lato backend

In UI:

- usa virtualizzazione (AG Grid la fa)
- evita cellRenderer troppo pesanti

## 11.9 - Esercizi guidati

### Esercizio 1: rendere visibile WBS06 nella griglia voci

1) apri `app/composables/estimates/useEstimateGridConfig.ts`
2) trova le colonne WBS (spesso nascoste)
3) metti `hide: false` su `wbs_hierarchy.wbs06`
4) ricarica la pagina e verifica

### Esercizio 2: migliorare il nome dei nodi WBS nel listino

1) apri `app/pages/projects/[id]/pricelist/index.vue`
2) trova `useWbsTree(rowData, { getLevels: ... })`
3) cambia `name` per includere anche il codice (es. `CODE - descrizione`)

### Esercizio 3: badge "righe filtrate / righe totali"

1) in una pagina con DataGrid, calcola:
   - `filteredRowData.length`
   - `rowData.length`
2) mostra un badge tipo: `X su Y`

Scopo: capire come si passa stato tra composables e template.
