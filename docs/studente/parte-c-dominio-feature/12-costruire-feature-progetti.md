# 12 - Costruire la feature "Progetti" (end-to-end)

Obiettivo: imparare il pattern completo UI -> API -> DB su una feature relativamente semplice,
così da avere una base solida per le feature più complesse (import, confronto, listino).

Perché "Progetti" è una buona palestra:

- ha CRUD classico (create/update/delete)
- usa DataGrid con paginazione, sorting e filtri
- introduce già concetti di contesto (project corrente)

## 12.1 - Requisiti minimi (cosa deve fare)

1) Mostrare una lista di progetti (commesse)
2) Cercare per codice/nome/descrizione/BU
3) Creare un progetto
4) Modificare un progetto
5) Eliminare un progetto (con cascata dati)
6) Entrare nel progetto e vedere dashboard e preventivi

## 12.2 - Mappa file: dove sta cosa oggi

### UI (frontend)

- lista progetti: `app/pages/projects/index.vue`
- modal creazione/modifica: `app/components/projects/ProjectFormModal.vue`
- composables:
  - `app/composables/useProjects.ts` (fetch con firma DataGrid)
  - `app/composables/useProjectCrud.ts` (create/update/delete + reload)
  - `app/composables/useProjectForm.ts` (stato del form e modale)
  - `app/composables/projects/useProjectGridConfig.ts` (colonne e config griglia)
- contesto:
  - `app/composables/useCurrentContext.ts` (project corrente)

### API Nitro (backend)

- list (DataGrid): `server/api/projects/index.get.ts`
- create: `server/api/projects/index.post.ts`
- update: `server/api/projects/[id].put.ts`
- delete (cascade): `server/api/projects/[id].delete.ts`
- dettaglio: `server/api/projects/[id].get.ts`
- contesto dashboard: `server/api/projects/[id]/context.get.ts`

### DB (Mongo)

- schema: `server/models/project.schema.ts`

## 12.3 - Design importante: DataGrid server-side (paginazione + filtri)

Il punto più "da prodotto" non è il CRUD, ma la lista con DataGrid.

### 12.3.1 - Come il frontend invia paginazione/sort/filtri

`useProjects()` costruisce query params e chiama:

- `GET /api/projects`

Parametri tipici:

- `page`, `pageSize`
- `search` (quick filter)
- `sort`, `order`
- `filters` (JSON string del filterModel AG Grid)

File: `app/composables/useProjects.ts`.

### 12.3.2 - Come il backend interpreta quei parametri

File: `server/api/projects/index.get.ts`.

Pattern:

1) parse `page`/`pageSize`, calcola `skip`
2) costruisce un oggetto `filter` Mongo
3) se `search` è presente, usa regex su più campi (`$or`)
4) se `filters` è presente, fa `JSON.parse` e traduce le regole (equals/contains/notBlank)
5) esegue due query in parallelo:
   - `find` con `skip/limit/sort`
   - `countDocuments` per `totalPages`

Questo è un pattern ottimo per griglie: scala bene e mantiene la UI reattiva.

## 12.4 - CRUD: punti da notare (non banali)

### 12.4.1 - Create: gestione conflitto su codice duplicato

File: `server/api/projects/index.post.ts`.

Regola di dominio:

- `code` dovrebbe essere unico

Quindi il backend:

- valida `name` e `code` (400)
- gestisce duplicate key (409)

Questo è importante per UX: un 409 è un errore "utente", non un 500.

### 12.4.2 - Delete: cascata dati (la parte davvero importante)

File: `server/api/projects/[id].delete.ts`.

Qui non puoi fare solo `Project.deleteOne`.

Il progetto contiene:

- baseline (Estimate)
- righe baseline (EstimateItem)
- WBS e listino per estimate
- offerte e righe offerte

Quindi la delete chiama:

- `deleteEstimateCascade` (in `server/services/EstimateService.ts`) per ogni estimate

Regola pratica:

> La cancellazione di un progetto non è un singolo delete: è un workflow di pulizia dati.

## 12.5 - Se dovessi costruirla da zero (ricetta pratica)

### Step 1: modello `Project` (Mongoose)

1) crea `server/models/project.schema.ts`
2) definisci campi minimi: `name`, `code`, `status`
3) aggiungi indice unique su `code`
4) esporta il model e includilo in `server/models/index.ts`

### Step 2: endpoint list con paginazione/filtri

1) crea `server/api/projects/index.get.ts`
2) implementa:
   - `page`, `pageSize`, `skip`
   - `search` su più campi
   - `filters` con parse e mapping su Mongo query
3) ritorna:
   - `data`, `total`, `page`, `pageSize`, `totalPages`

### Step 3: endpoint create/update/delete

- `POST /api/projects`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id` (cascade)

### Step 4: composable `useProjects` con firma DataGrid

1) crea `app/composables/useProjects.ts`
2) definisci `fetchProjects(params)` che:
   - costruisce query params
   - chiama `$fetch('/api/projects', { query })`
3) ritorna `DataGridFetchResponse<Project>`

### Step 5: pagina `projects/index.vue`

1) usa `DataGridPage`
2) configura colonne con `useProjectGridConfig`
3) gestisci azioni:
   - open (naviga)
   - edit (modal)
   - delete (confirm + API)

## 12.6 - Esercizi (per consolidare)

### Esercizio 1: aggiungi campo `notes` al progetto

1) DB: aggiungi `notes` allo schema `Project`
2) API: accetta `notes` in POST/PUT
3) UI: aggiungi campo nel modal
4) verifica: crea e modifica un progetto, poi ricarica lista

### Esercizio 2: migliora la ricerca e i filtri

1) backend: estendi `search` o `filters` su un campo in più
2) frontend: aggiungi filtro colonna nella griglia e verifica che arrivi come `filterModel`

### Esercizio 3: paginazione reale (UI)

Attualmente la UI spesso usa `pageSize` grande.

Esercizio:

- implementa paginazione in UI leggendo `totalPages` e cambiando pagina

## 12.7 - Checkpoint (quando puoi dire "ok, l'ho capita")

Se riesci a rispondere a queste domande, hai capito la feature:

1) Qual è il contratto della response di `GET /api/projects`?
2) Come viene codificato `filterModel` in query string e decodificato nel backend?
3) Come viene gestito il conflitto su `code` duplicato?
4) Perché la delete non è un semplice `Project.deleteOne`?
