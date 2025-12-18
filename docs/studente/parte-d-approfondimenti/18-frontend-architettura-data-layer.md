# 18 - Frontend: architettura, data layer, DataGrid, store

Obiettivo: avere una visione "da architetto pratico" di come è organizzato il frontend Taboolo, così da:

- sapere dove aggiungere una feature
- non duplicare logica (soprattutto su griglie/filtri/export)
- mantenere una UI coerente (layout, header, sidebar, pattern)

Questo capitolo è volutamente concreto: parla di file reali della repo.

## 18.1 - Flusso standard dei dati (il pattern che vedrai ovunque)

Il frontend segue, in generale, questo percorso:

1) pagina (`app/pages/...`) decide cosa mostrare
2) composable (`app/composables/...`) incapsula fetch e stato
3) API client (`app/lib/api-client.ts`) chiama `/api/...`
4) componenti (`app/components/...`) renderizzano (DataGrid, sidebar, wizard)

Se ti perdi: riparti da qui e segui le chiamate.

## 18.2 - Pagine: "container" che collega route, fetch e componenti

Le pagine sono in `app/pages/` e sono route-based.

Nel codice, una pagina fa tipicamente:

- legge parametri route (`useRoute`)
- legge query string (filtri)
- richiama composables per configurare griglie e fetch
- renderizza `DataGridPage` e inserisce sidebar/toolbar

Esempi:

- `app/pages/projects/index.vue` (lista progetti)
- `app/pages/projects/[id]/estimate/[estimateId]/detail.vue` (voci baseline)
- `app/pages/projects/[id]/estimate/[estimateId]/offer.vue` (voci offerta)

## 18.3 - Layout: coerenza visiva e navigazione

Componenti/layout principali:

- `app/layouts/default.vue`
- `app/layouts/SidebarLayout.vue`
- `app/components/layout/AppHeader.vue`
- `app/components/layout/AppSidebar.vue`
- `app/components/layout/MainPage.vue`
- `app/components/layout/DataGridPage.vue`

Il pattern ricorrente è:

- un header con titolo, breadcrumb e azioni
- un body con:
  - griglia (AG Grid)
  - sidebar opzionale (WBS)

## 18.4 - DataGrid: perché è "il cuore" della UI

Taboolo è una app di analisi: gran parte dell'esperienza è una griglia con:

- colonne molte
- filtri
- esportazione
- calcoli (totali, importi)
- stati (loading/empty/error)

Per non duplicare codice, la repo ha un piccolo "sistema DataGrid":

- componenti: `app/components/data-grid/*`
- composables: `app/composables/useDataGrid*.ts`
- config specifiche: `app/composables/estimates/*GridConfig.ts`

### 18.4.1 - Componenti DataGrid principali

Alcuni file chiave:

- `app/components/data-grid/DataGrid.vue`: wrapper principale AG Grid
- `app/components/data-grid/DataGridToolbar.vue`: toolbar (filtri, export, colonne)
- `app/components/data-grid/DataGridHeader.vue`: header griglia (titolo/azioni)
- `app/components/data-grid/ColumnVisibilityPopover.vue`: show/hide colonne
- `app/components/data-grid/ColumnFilterPopover.vue`: filtri per colonna

Se devi cambiare UI della griglia (non i dati), parti da qui.

### 18.4.2 - Composables DataGrid

Composables utili:

- `app/composables/useDataGrid.ts`: orchestration (API grid, stato)
- `app/composables/useDataGridColumns.ts`: definizione/gestione colonne
- `app/composables/useDataGridFilters.ts`: filtro chips/modal, stato filtri
- `app/composables/useDataGridExport.ts`: export (CSV/Excel, se presente)

Se devi cambiare comportamento (non layout), parti da questi.

### 18.4.3 - Config specifiche per dominio (progetti, preventivi, listini)

Qui si mappa "dominio -> colonne":

- `app/composables/projects/useProjectGridConfig.ts`
- `app/composables/estimates/useEstimateGridConfig.ts`
- `app/composables/estimates/usePriceListGridConfig.ts`

Qui è dove aggiungi o rimuovi colonne "di business".

## 18.5 - WBS: la sidebar che filtra tutto

La WBS (Work Breakdown Structure) è centrale nel dominio.

Nel frontend la WBS compare come sidebar e filtra le righe mostrate in griglia.

File importanti:

- `app/components/wbs/WbsSidebar.vue`
- `app/components/wbs/WbsTree.vue` e nodi
- `app/composables/useWbsTree.ts` (costruzione albero + filtro)

Pattern:

- l'albero è costruito da dati presenti nelle righe (es. livelli WBS)
- la selezione di un nodo filtra per prefisso/gerarchia

Collegamento: vedi anche `docs/studente/parte-c-dominio-feature/11-pagine-data-grid-wbs.md`.

## 18.6 - Composables Avanzati (Navigazione e Layout)

Oltre ai composables per DataGrid e WBS, esistono composables critici per la navigazione e il layout.

### `useNavigation`

File: `app/composables/useNavigation.ts`

Scopo: Costruisce dinamicamente l'albero di navigazione della sidebar.

Input:
- `currentProject`: progetto corrente (o null)
- `currentEstimate`: preventivo corrente (o null)

Output:
- `globalNodes`: nodi sempre visibili (Home, Progetti, Listini Generali)
- `contextNodes`: nodi contestuali (progetto → preventivi → round → imprese → confronto)

Logica chiave:
- Quando un preventivo è attivo, espande automaticamente i suoi figli (Progetto, Gare & Offerte, Confronto)
- Genera link dinamici per ogni combinazione round/company
- Distingue tra offerte `detailed` e `aggregated` per mostrare o meno il link "Preventivo"

### `useSidebarLayout`

File: `app/composables/useSidebarLayout.ts`

Scopo: Gestisce lo stato collapsed/expanded della sidebar.

Features:
- Persistenza dello stato in localStorage
- Toggle collapse/expand
- Responsive: auto-collapse su mobile

### `useProjectTree`

File: `app/composables/useProjectTree.ts`

Scopo: Costruisce un albero di progetti per la UI.

Usato in: Selettori progetto, breadcrumb, navigazione.

### `useProjectCrud`

File: `app/composables/useProjectCrud.ts`

Scopo: Operazioni CRUD sui progetti dal frontend.

Funzioni:
- `createProject(data)`: chiama `POST /api/projects`
- `updateProject(id, data)`: chiama `PUT /api/projects/:id`

## 18.7 - API client: l'SDK del frontend

File: `app/lib/api-client.ts`

È grande perché contiene molte funzioni (alcune legacy o non ancora implementate nel backend).

Il pattern importante è `apiFetch`:

- prende un path (`/projects`, `/projects/:id/...`)
- costruisce URL base (runtime config o fallback)
- aggiunge header (token, content-type)
- gestisce errori (inclusi 401 -> redirect login)

Regole pratiche quando aggiungi una API:

1) crea/aggiorna l'endpoint Nitro in `server/api/...`
2) aggiungi una funzione in `app/lib/api-client.ts`
3) tipizza request/response usando `app/types/api.ts` (o file dedicati)
4) usa quella funzione in un composable o direttamente nella pagina

## 18.7 - Store Pinia vs composables: chi fa cosa in Taboolo

Cartella: `app/stores/`

Esempi:

- `app/stores/filters.ts`: filtri condivisi
- `app/stores/project.ts`: stato progetto corrente / preferenze
- `app/stores/ui.ts`: preferenze UI (sidebar open, ecc.)

Nel progetto convivono:

- stores (globale, condiviso)
- composables (locale, riusabile)

Regola pratica:

- se lo stato serve a più pagine e deve sopravvivere alla navigazione -> store
- se lo stato serve a un componente/pagina e vuoi riusarlo -> composable

## 18.8 - Plugin frontend: dove si agganciano librerie esterne

Cartella: `app/plugins/`

File tipici:

- `ag-grid.client.ts` (client-only)
- `sonner.client.ts` (toast)
- `api-client.ts` (wiring per API)

Se una libreria richiede DOM o `window`, deve stare in un plugin `.client.ts`.

## 18.9 - Esercizio guidato: aggiungere una colonna "sicura" alla griglia voci

Obiettivo: aggiungere una colonna in una griglia senza rompere il resto.

Passi:

1) individua la config della griglia (es. `app/composables/estimates/useEstimateGridConfig.ts`)
2) aggiungi una colonna che usa un campo già presente nelle righe
3) verifica:
   - ordinamento
   - filtro
   - export (se abilitato)

Se riesci a farlo, hai capito la parte più "operativa" del frontend.

## 18.10 - Esercizio: mappa una pagina con il ciclo UI -> API -> DB

Scegli una pagina (es. `detail.vue`) e scrivi:

1) quali parametri route legge
2) quali endpoint chiama (Network tab o `rg "/api/"`)
3) quali dati mostra nella griglia (colonne)
4) dove avviene il filtro WBS

Questo esercizio ti allena a fare debugging e a "entrare" in una feature senza panico.
