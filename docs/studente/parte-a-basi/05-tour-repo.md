# 05 - Tour della repo (mappa mentale + dove mettere le mani)

Obiettivo: sapere "dove vivere" quando devi cambiare qualcosa, senza perdere ore a cercare file a caso.

Questo capitolo è una mappa. Non leggerlo come narrativa: usalo come riferimento mentre navighi il codice.

## 05.1 - Struttura ad alto livello

```
app/        frontend Nuxt (pages/components/composables/stores)
server/     backend Nitro (api/models/services/utils/plugins)
services/   servizi esterni (in particolare: importer Python)
old/        codice legacy (React) usato come riferimento/migrazione
types/      tipi d'appoggio (d.ts)
docs/       documentazione (questo "libro")
public/     asset statici
locales/    file i18n (se/quando attivata la localizzazione)
```

### 05.1.1 - Regola pratica: "cambia qui, non lì"

- Se è UI: `app/pages/` (route) o `app/components/` (componenti riusabili)
- Se è logica UI: `app/composables/` o `app/stores/`
- Se è chiamata HTTP dal frontend: `app/lib/api-client.ts`
- Se è API backend: `server/api/` (controller layer)
- Se è logica backend: `server/services/` (service layer)
- Se è schema DB: `server/models/`
- Se è mapping/normalizzazione import: `server/utils/` + `server/services/ImportPersistenceService.ts`
- Se è parsing file: `services/importer/` (Python)

## 05.2 - Frontend: `app/`

Percorsi chiave:

- `app/pages/`: routing e pagine (una route = un file)
- `app/components/`: componenti UI (griglie, wizard, sidebar, UI kit)
- `app/composables/`: logica riusabile (DataGrid, export, WBS tree, contesto)
- `app/stores/`: Pinia stores (stato condiviso)
- `app/lib/`: utility di dominio e client HTTP (es. `api-client.ts`)
- `app/plugins/`: plugin Nuxt (alcuni solo client, es. AG Grid)
- `app/layouts/`: layout (default + sidebar)
- `app/assets/css/main.css`: stile e variabili CSS (tailwind + tokens)

### 05.2.1 - Ordine "furbo" per leggere il frontend

Se vuoi capire l'app come flusso utente:

1) `app/pages/index.vue` (redirect iniziale)
2) `app/pages/projects/index.vue` (lista progetti)
3) `app/pages/projects/[id]/index.vue` (dashboard progetto)
4) `app/pages/projects/[id]/import/index.vue` (import baseline + offerte)
5) `app/pages/projects/[id]/estimate/[estimateId]/index.vue` (shell preventivo)
6) `app/pages/projects/[id]/estimate/[estimateId]/detail.vue` (voci baseline)
7) `app/pages/projects/[id]/estimate/[estimateId]/offer.vue` (voci offerta)
8) `app/pages/projects/[id]/estimate/[estimateId]/comparison.vue` (confronto)

Poi scendi nei componenti:

- `app/components/estimates/EstimateItemsPage.vue` (pattern pagina "items")
- `app/components/layout/DataGridPage.vue` (layout griglia + header + sidebar)
- `app/components/wbs/WbsSidebar.vue` (filtro WBS)

### 05.2.2 - Dove si configurano le griglie

Le colonne e la logica DataGrid spesso stanno nei composables:

- `app/composables/useDataGrid.ts` e `app/composables/useDataGridColumns.ts`
- `app/composables/estimates/useEstimateGridConfig.ts`
- `app/composables/estimates/usePriceListGridConfig.ts`

Se vuoi cambiare una colonna o un formatter, parti da lì.

## 05.3 - Backend: `server/` (Nitro)

Percorsi chiave:

- `server/api/`: endpoint Nitro (controller)
- `server/models/`: modelli Mongo (Mongoose schema)
- `server/services/`: logica applicativa (import, persistenza, aggregazioni)
- `server/utils/`: utilità (proxy python, mapper, normalize, serialize)
- `server/plugins/mongoose.ts`: connessione a Mongo

### 05.3.1 - Ordine "furbo" per leggere il backend

1) `server/plugins/mongoose.ts` (connessione)
2) `server/models/index.ts` (export modelli)
3) `server/api/projects/index.get.ts` (pattern list + filtri)
4) `server/api/projects/[id]/context.get.ts` (dashboard progetto)
5) `server/api/projects/[id]/import-six/preview.post.ts` (preview import SIX)
6) `server/api/projects/[id]/import-six.post.ts` (import SIX raw)
7) `server/api/projects/[id]/offers.post.ts` (import offerte)
8) `server/services/ImportPersistenceService.ts` (cuore persistenza import)

## 05.4 - Servizio Python importer: `services/importer/`

Questa cartella contiene un servizio FastAPI che fa parsing e normalizzazione dei file.

Punti chiave:

- entrypoint: `services/importer/main.py`
- router: `services/importer/api/router.py`
- endpoint import ritorni: `services/importer/api/endpoints/returns.py`
- endpoint import SIX raw: `services/importer/api/endpoints/raw.py`

Il backend Nuxt non ricalcola il parsing: fa da proxy multipart e poi persiste su Mongo (capitolo 10).

## 05.5 - Legacy: `old/`

`old/` contiene codice legacy (React) utile per:

- capire requisiti originali e pattern di query
- migrare concetti (es. naming, struttura dati, feature simili)

Capitolo dedicato: `docs/studente/parte-c-dominio-feature/15-migrazione-old-react.md`.

## 05.6 - Come cercare nel codice (superpotere: `rg`)

Esempi utili:

- trovare dove si chiama un endpoint: `rg "/api/projects" -n app`
- trovare dove si usa una colonna: `rg "unit_price" -n app`
- trovare una funzione backend: `rg "persistImportResult" -n server`

Impara a usare `rg`: ti risparmia giorni.

## 05.7 - Esercizi "da mappa"

1) Vuoi cambiare il totale in dashboard progetto:
   - parti da `server/api/projects/[id]/context.get.ts`
   - segui il service chiamato
2) Vuoi cambiare le colonne delle voci:
   - parti da `app/composables/estimates/useEstimateGridConfig.ts`
3) Vuoi cambiare come viene costruita la WBS:
   - guarda `server/services/WbsService.ts` e `app/composables/useWbsTree.ts`

Se riesci a indicare "il primo file" giusto per ciascun punto, hai già capito come orientarti nella repo.
