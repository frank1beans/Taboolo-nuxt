# 10 — Convenzioni e debug

Questa sezione raccoglie convenzioni utili e consigli di debug.

## 10.1 — Convenzioni di naming e concetti

- “Project” = “Commessa/Progetto”
- “Estimate” = “Preventivo”
- “Baseline” = `Estimate.type=project` (ed eventualmente `is_baseline=true`)
- “Offer” = testata offerta collegata a una baseline (`Offer.estimate_id`)
- “OfferItem”:
  - detailed → `estimate_item_id`
  - aggregated → `price_list_item_id`

## 10.2 — Incoerenze note nei path API

Nel repo convivono:

- `/api/projects/:id/estimate/:estimateId/...` (singolare)
- `/api/projects/:id/estimates/:estimateId/...` (plurale)

Esempi:

- `GET /estimate/:estimateId/items` (voci)
- `GET /estimates/:estimateId/price-list` (listino)
- `DELETE /estimates/:estimateId` (delete estimate)

Consiglio:

> Per nuove API, scegliere uno standard e migrare gradualmente (con alias/backward compat) per ridurre confusione.

## 10.3 — ObjectId e conversioni

Punti delicati:

- `EstimateItem.price_list_item_id` è string → in aggregazioni va convertito a ObjectId
- `OfferItem` usa ObjectId per `price_list_item_id` e `estimate_item_id`

Se vedi errori di tipo `$toObjectId`:

- probabilmente una stringa non è un ObjectId valido
- verifica l’import/persistenza di quella colonna

## 10.4 — Logging

Il codice usa `console.log`/`console.warn` in vari punti (import e cascade).

Consiglio operativo:

- in produzione, ridurre log su hot path o usare livelli (info/warn/error)
- mantenere log chiari per import (id import run, projectId, estimateId)

## 10.5 — Aree in evoluzione

- `/catalogs` è placeholder (UI non completa)
- `app/plugins/api-client.ts` è uno stub (non usato come plugin, il client è in `app/lib/api-client.ts`)

