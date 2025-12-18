# 14 — Servizi Backend (Service Layer)

Questa appendice documenta i servizi principali nel layer `server/services/`.

I servizi incapsulano la logica di business e le operazioni di persistenza complesse. Gli endpoint in `server/api/` li chiamano per non avere troppa logica nei controller.

## 14.1 — `EstimateService.ts`

File: `server/services/EstimateService.ts`

### Funzioni principali

#### `upsertEstimate(projectId, data)`

Crea o aggiorna un documento `Estimate`.

- Normalizza il tipo (`project` | `offer`)
- Gestisce campi opzionali (nome, disciplina, revisione, totali, delta, note, ecc.)

#### `upsertEstimatesBatch(projectId, estimates[])`

Batch upsert di più preventivi (usato in import multi-preventivo).

#### `upsertEstimateItems(projectId, estimateId, items[], wbs6Map, wbs7Map)`

Persiste le righe di un preventivo baseline.

Logica:
1. **Cancella** tutte le righe esistenti per `(project_id, estimate_id)` → idempotenza
2. Costruisce i documenti `EstimateItem` con:
   - WBS linkati (`wbs_ids` array)
   - Dati normalizzati (descrizione, unità, prezzo, quantità)
3. **InsertMany** in batch

#### `deleteEstimateCascade(projectId, estimateId, session?)`

⚠️ **Funzione critica** — Cancella un preventivo e **tutti i dati collegati**.

Ordine di cancellazione:
1. `Offer` e `OfferItem` (ritorni collegati all'estimate)
2. `EstimateItem` (righe baseline)
3. `PriceListItem` (voci listino)
4. `PriceList` (testata listino)
5. `WbsNode` (struttura WBS)
6. `Estimate` (testata preventivo)

Ritorna un oggetto con i conteggi di ogni tipo cancellato.

---

## 14.2 — `WbsService.ts`

File: `server/services/WbsService.ts`

### Funzioni principali

#### `upsertWbsHierarchy(projectId, estimateId, nodes[])`

Upsert massivo di nodi WBS con relazioni parent/child.

Logica:
1. Normalizza i codici WBS
2. Deriva `level` e `type` (`spatial` | `commodity`) dal codice
3. BulkWrite con upsert
4. Costruisce relazioni parent-child e array `ancestors`
5. Ritorna mappe `{ spatial, wbs6, wbs7 }` → code → ObjectId

#### `buildAndUpsertWbsFromItems(projectId, estimateId, items[], fallbackNodes)`

Costruisce la gerarchia WBS a partire dalle righe di computo.

Per ogni riga:
1. Legge `wbs_levels[]`
2. Ordina per livello
3. Inferisce parent-child
4. Chiama `upsertWbsHierarchy`

Usato in: `ImportPersistenceService.persistProjectEstimate`

---

## 14.3 — `OfferService.ts`

File: `server/services/OfferService.ts`

### Funzioni principali

#### `deleteOfferCascade(projectId, offerId, session?)`

Cancella un'offerta e tutte le sue righe (`OfferItem`).

Ordine:
1. `OfferItem.deleteMany`
2. `Offer.deleteOne`

#### `updateOffer(projectId, offerId, input)`

Aggiorna i metadati di un'offerta.

Campi ammessi:
- `name`, `company_name`, `round_number`
- `status`: `draft` | `submitted` | `accepted` | `rejected`
- `mode`: `detailed` | `aggregated`
- `total_amount`, `description`, `date`

Validazioni:
- `round_number` deve essere numerico
- `status` e `mode` devono essere nei valori ammessi

---

## 14.4 — `ImportPersistenceService.ts`

File: `server/services/ImportPersistenceService.ts`

Questo è il servizio più grande (~530 righe). Gestisce la persistenza dei dati importati da SIX e Excel.

### Funzioni principali

#### `persistImportResult(payload, projectId)`

Entry point per import SIX raw. Chiama `persistProjectEstimate`.

#### `persistProjectEstimate(payload, projectId)`

Persiste un preventivo baseline completo:
1. Normalizza testi (descrizioni, unità)
2. Costruisce WBS via `upsertWbsHierarchy`
3. Crea/aggiorna `PriceList` e `PriceListItem`
4. Crea/aggiorna `Estimate`
5. Cancella e reinserisce `EstimateItem`

#### `persistOffer(payload, projectId)`

Persiste un'offerta importata da Excel.

Logica complessa:
1. Trova baseline di riferimento (`estimate_id`)
2. Crea/aggiorna `Offer`
3. Per ogni riga:
   - **Detailed mode**: match su `progressive` → `EstimateItem._id`
   - **Aggregated mode**: match su `code+description` → `PriceListItem._id`
4. Gestisce **pending** (ambiguità): se match non univoco, salva `candidate_price_list_item_ids`

Helper interno: `normalizeDescription(desc)` — rimuove `_x000D_`, newline, spazi multipli, accenti.

---

## 14.5 — `CatalogService.ts`

File: `server/services/CatalogService.ts`

Servizio per listini generali (non legati a progetto). Al momento contiene:
- Query base per cataloghi globali

---

## Regole pratiche

1. **Idempotenza**: molte funzioni usano delete+insert per garantire che un re-import non duplichi dati
2. **Transazioni**: alcune funzioni accettano `session` per partecipare a transazioni Mongo
3. **Normalizzazione**: i testi vengono sempre normalizzati prima del salvataggio per facilitare match successivi
