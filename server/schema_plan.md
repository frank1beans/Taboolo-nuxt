# Database schema (current)

Questo documento riepiloga lo schema attuale usato in `server/models`.
Non e' un piano di migrazione, ma un riferimento rapido per sviluppatori.

## Collections

- `projects`
- `estimates`
- `estimateitems`
- `pricelists`
- `pricelistitems`
- `wbsnodes`
- `offers`
- `offeritems`
- `offeralerts`
- `user_contexts`

## Modelli principali

### Project

Campi base progetto: `name`, `code`, `description`, `notes`, `business_unit`, `revision`, `status`.

### Estimate (baseline)

- `project_id`
- `name`, `type` (`project`)
- `is_baseline`
- `total_amount`, `price_list_id`, `source_preventivo_id`, `import_run_id`

Nota: le offerte non sono piu gestite come `Estimate` di tipo `offer`. Sono una collezione separata (`Offer`).

### EstimateItem

- `project_id`, `wbs_ids`, `price_list_item_id`
- `code`, `unit_measure`, `progressive`, `order`
- `project` con quantita e prezzi baseline

### PriceList / PriceListItem

- `PriceList` collega `project_id` e `estimate_id`.
- `PriceListItem` include `code`, `description`, `long_description`, `extended_description`, `unit`, `price`.
- Campi semantic map: `embedding`, `map2d`, `map3d`, `cluster`, `map_version`.

### WbsNode

- `project_id`, `estimate_id`, `parent_id`, `ancestors`
- `type`, `level`, `code`, `description`

### Offer

- `project_id`, `estimate_id` (baseline)
- `company_name`, `round_number`, `mode` (`detailed`/`aggregated`)
- `status`, `total_amount`

### OfferItem

- `offer_id`, `project_id`
- `origin`, `source`, `resolution_status`
- `estimate_item_id` (detailed) o `price_list_item_id` (aggregated)
- `quantity`, `unit_price`

### OfferAlert

- `offer_id`, `offer_item_id`, `estimate_id`
- `type`, `severity`, `status`
- `actual`, `expected`, `delta`, `message`

### UserContext

- `user_id`, `organization_id`
- `current_project_id`, `current_estimate_id`

## Relazioni chiave

- Un Project ha piu baseline (Estimate).
- Un Estimate ha WBS, Listino e EstimateItem.
- Un Offer e' sempre collegata a un Estimate baseline.
- OfferItem e OfferAlert gestiscono match e conflitti delle offerte.

Per dettagli completi: `docs/reference/modello-dati.md`.
