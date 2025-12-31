# 03 — Modello dati (MongoDB)

Questa sezione descrive i principali schemi MongoDB (Mongoose) e come si collegano.

> Fonte: `server/models/*.schema.ts`

## 3.1 — Project

File: `server/models/project.schema.ts`

Campi principali:

- `name` (required)
- `code` (required, **unique**, indexed)
- `description`, `notes`, `business_unit`, `revision` (opzionali)
- `status`: `setup | in_progress | closed`
- timestamps: `created_at`, `updated_at`

Note:

- `toJSON/toObject` aggiunge `id` e rimuove `_id` e `__v`

## 3.2 — Estimate (preventivo)

File: `server/models/estimate.schema.ts`

Campi principali:

- `project_id` (ObjectId, required, index)
- `name` (required)
- `type`: `project | offer`
- `is_baseline` (boolean)
- campi meta (disciplina, revisione, impresa, round_number, note, ecc.)
- `price_list_id` (string) → link logico a PriceList (storico/compat)
- `import_run_id` (index)
- timestamps + serialization (aggiunge `id`, stringifica `project_id`)

Note:

- le offerte “vere” sono in collezione `Offer`; `Estimate.type = offer` è usato in alcune pipeline legacy/mapping.

## 3.3 — WbsNode (WBS)

File: `server/models/wbs.schema.ts`

Concetto:

- WBS è **per-estimate** (chiave: `project_id + estimate_id`).

Campi:

- `project_id` (required, index)
- `estimate_id` (required, index)
- `parent_id` (per albero)
- `type`: `spatial | commodity`
- `level` (1–7)
- `category` (es. `wbs01`…`wbs07`)
- `code` (required)
- `description` (opzionale)
- `ancestors` (materialized path)

Indici:

- `{ project_id, code, type }`
- `{ project_id, parent_id }`
- `{ project_id, estimate_id, level }`

## 3.4 — PriceList

File: `server/models/price-list.schema.ts`

Nota: al momento è usato come “contenitore” per metadata listino.

Campi:

- `project_id` (optional, index)
- `estimate_id` (optional, index)
- `name` (required)
- `currency` (default EUR)
- `is_default` (boolean)
- `import_run_id` (index)

Indice:

- `{ project_id, estimate_id }`

## 3.5 — PriceListItem (voce di listino)

File: `server/models/price-list-item.schema.ts`

Concetto:

- è **per-estimate** (`estimate_id` required).

Campi:

- `estimate_id` (ObjectId, required, index)
- `project_id` (optional, index)
- `code` (required)
- `description`, `long_description`, `unit`, `price`
- `wbs_ids` (array ObjectId → WbsNode)
- `price_lists` (Map<string, number>) per prezzi multipli
- `embedding` (array number, `select: false`)

Indici:

- full-text su `{ code, description, long_description }`
- `{ project_id, estimate_id }`

## 3.6 — EstimateItem (voce computo baseline)

File: `server/models/estimate-item.schema.ts`

Concetto:

- rappresenta una riga del computo baseline (per `project.estimate_id`).

Campi principali:

- `project_id` (required, index)
- `wbs_ids` (required, array ObjectId)
- `price_list_item_id` (**string**, required, index)
- override opzionali: `code`, `description`, `description_extended`, `unit_measure`
- ordering: `progressive`, `order`
- `project`: `{ estimate_id, quantity, unit_price, amount, notes, measurements }`
- `offers`: array (storico/compat; oggi la collezione “vera” è `OfferItem`)

Indici:

- `{ project_id, wbs_ids }`
- `{ project_id, 'project.estimate_id' }`

Nota importante:

> `price_list_item_id` è memorizzato come string (non ObjectId).  
> In varie aggregazioni viene convertito a ObjectId con `$toObjectId`/`$convert`.

## 3.7 — Offer (testata offerta)

File: `server/models/offer.schema.ts`

Campi:

- `project_id` (required, index)
- `estimate_id` (required, index) → baseline estimate
- `company_name` (required, index)
- `round_number` (required)
- `mode`: `detailed | aggregated`
- `status`: `draft | submitted | accepted | rejected`
- `total_amount` (opzionale)

Indice:

- `{ project_id, company_name, round_number }` (anti-duplicati / lookup veloce)

## 3.8 — OfferItem (riga offerta)

File: `server/models/offer-item.schema.ts`

Strategie di linkage:

- **detailed**: link a `estimate_item_id` (riga baseline)
- **aggregated**: link a `price_list_item_id` (voce listino)

Campi chiave:

- `offer_id` (required, index)
- `project_id` (required, index)
- `origin`: `baseline | addendum`
- `source`: `detailed | aggregated`
- `resolution_status`: `resolved | pending`
- `candidate_price_list_item_ids`: array ObjectId (quando match non univoco)
- `estimate_item_id` (ObjectId, optional)
- `price_list_item_id` (ObjectId, optional)
- snapshot: `code`, `description`, `unit_measure`
- valori: `quantity`, `unit_price`, `amount`

Hook di validazione (importante):

- se `source === aggregated` **oppure** `origin === addendum`:
  - azzera `estimate_item_id` e `progressive`
- se manca `resolution_status`:
  - diventa `resolved` se c’è `price_list_item_id`, altrimenti `pending`
- se `source === detailed` e non addendum:
  - richiede `estimate_item_id`

Indici:

- `{ offer_id, estimate_item_id }`
- `{ offer_id, price_list_item_id }`

## 3.9 - OfferAlert (alert import offerte)

File: `server/models/offer-alert.schema.ts`

Scopo:

- traccia gli alert generati durante l'import offerte (mismatch prezzo, quantita, codice)
- registra addendum o match ambigui per revisione

Campi principali:

- `project_id`, `estimate_id`, `offer_id`, `offer_item_id`
- `type`: `price_mismatch | quantity_mismatch | code_mismatch | ambiguous_match | addendum`
- `severity`: `info | warning | error`
- `status`: `open | resolved | ignored`
- `resolved_at`, `resolution_note`
- `actual`, `expected`, `delta`
- `code`, `baseline_code`
