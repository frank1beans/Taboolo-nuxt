# 04 — Pipeline import

Questa sezione documenta come funziona l’import dati (baseline e offerte).

## 4.1 — Import computo SIX/XML (Raw)

### Endpoint

- Preview: `POST /api/projects/:projectId/import-six/preview?mode=raw`
  - file: multipart (`file`)
  - implementazione: `server/api/projects/[id]/import-six/preview.post.ts`
- Import: `POST /api/projects/:projectId/import-six?mode=raw`
  - file: multipart (`file`)
  - campo opzionale: `estimate_id` (selezione preventivo nel file)
  - implementazione: `server/api/projects/[id]/import-six.post.ts`

Nota:

> La modalità “legacy” SIX è deprecata: l’endpoint risponde 400 se non usi Raw.

### Dipendenze

- `server/importers/python-six/client.ts` → `runSixImportRaw` e `previewSixImportRaw`
- `server/utils/python-proxy.ts` → proxy multipart verso Python
- `server/services/ImportPersistenceService.ts` → persistenza in Mongo

### Forma del payload (alto livello)

La pipeline Raw moderna lavora con un payload tipo:

```ts
{
  project: {...},
  estimate: {..., items: [...]},
  groups: [...],      // WBS nodes (SOLO quelli usati da items/product)
  price_list: {...}   // listino + items
}
```

Se il Python restituisce già questo schema, `mapRawImportPayload` fa pass-through.

### Persistenza: `persistImportResult`

File: `server/services/ImportPersistenceService.ts`

`persistImportResult` decide il ramo in base a `payload.estimate.type`:

- `offer`/`ritorno` → `persistOffer(...)`
- altrimenti → `persistProjectEstimate(...)`

### Persistenza baseline: `persistProjectEstimate`

Fasi principali:

1) determina `projectObjectId` e risolve `estimateId` (riuso se esiste una baseline con stesso nome)
2) WBS:
   - costruisce una mappa di ID (source id → new ObjectId)
   - upsert in `WbsNode` con `project_id + estimate_id`
3) PriceList:
   - upsert `PriceList` per `project_id + estimate_id`
4) PriceListItem:
   - filtra le voci di listino **solo** a quelle realmente usate nel computo (evita gonfiare DB)
   - cancella le vecchie PLI dell’estimate prima di reinserire (anti-duplicati)
5) Estimate (testata):
   - crea/aggiorna la baseline con link a `price_list_id`
6) EstimateItem (voci):
   - cancella le vecchie voci per quell’estimate (anti-duplicati)
   - inserisce le nuove voci con `price_list_item_id`, `wbs_ids`, quantità, importi

Nota sulle descrizioni:

- usa `normalizeTextFields` per riempire `short_description`, `long_description`, `unit`

## 4.2 — Import offerte (Excel) via Python proxy

### Endpoint

- `POST /api/projects/:projectId/offers`
  - multipart: `file`, `company`, `sheet_name`, mapping colonne, ecc.
  - query: `estimate_id`, `mode`, `round_number`, ecc. (usata per leggere campi senza consumare stream due volte)
  - implementazione: `server/api/projects/[id]/offers.post.ts`

### Persistenza: `persistOffer`

File: `server/services/ImportPersistenceService.ts`

Passi principali:

1) risolve la baseline `baselineEstId`:
   - usa `payload.estimate.estimate_id` se presente
   - altrimenti prende l’ultima baseline `Estimate.type=project` (preferendo `is_baseline`)
2) crea/aggiorna `Offer` (testata):
   - chiave logica: `project_id + company_name + round_number`
   - salva `mode` (`detailed`/`aggregated`)
3) elimina vecchi `OfferItem` di quella offerta
4) prepara lookup:
   - detailed: mappa `progressive -> EstimateItem._id` (baseline)
   - aggregated: costruisce mappe su `PriceListItem` per `code` e descrizioni normalizzate
5) per ogni riga importata:
   - prova a risolvere il link
   - se non risolve → `origin=addendum` e/o `resolution_status=pending`
   - se risolve in aggregated ma non univoco → salva `candidate_price_list_item_ids`
6) inserisce i `OfferItem`

### Pending resolution (ambiguità)

Quando ci sono candidati multipli:

- la riga viene salvata con `resolution_status = pending`
- l’UI mostra una scelta utente (pagina Listino)
- l’endpoint `PATCH /api/projects/:id/offers/items/:itemId` salva `price_list_item_id` e marca `resolved`

## 4.3 — Cascate di cancellazione

### Eliminazione offerta

File: `server/services/OfferService.ts`

- `deleteOfferCascade(projectId, offerId)` elimina:
  - `OfferItem` dell’offerta
  - `Offer` testata

### Eliminazione preventivo (estimate) con cascade

File: `server/services/EstimateService.ts`

- `deleteEstimateCascade(projectId, estimateId)` elimina:
  - Offers + OfferItems collegati alla baseline
  - EstimateItems
  - PriceListItems
  - PriceLists
  - WBSNodes
  - Estimate doc

Nota: è usata anche nella delete del progetto (`server/api/projects/[id].delete.ts`).

