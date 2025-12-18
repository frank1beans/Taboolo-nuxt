# 06 — API: Preventivi e voci

Questa sezione descrive le API che alimentano “Dettaglio Preventivo”, “Dettaglio Offerta”, “Listino” e WBS.

> Nota naming: nel repo convivono path `estimate` e `estimates`. La UI usa entrambi in base alla funzione.

## 6.1 — GET `/api/projects/:id/estimate/:estimateId`

File: `server/api/projects/[id]/estimate/[estimateId].get.ts`

Scopo:

- recuperare la testata dell’estimate (baseline).

## 6.2 — GET `/api/projects/:id/estimate/:estimateId/items`

File: `server/api/projects/[id]/estimate/[estimateId]/items.get.ts`

Scopo:

- restituire le righe per la tabella “voci”.

Modalità:

### A) Baseline mode (default)

Quando **non** passi filtri `round`/`company`:

- legge `EstimateItem` filtrando per `project_id` + `project.estimate_id`
- fa lookup su `PriceListItem` usando `price_list_item_id` (string → ObjectId)
- costruisce `wbs_hierarchy` includendo WBS 01–07
- calcola `project.amount` (fallback quantità × prezzo listino se mancante)

### B) Offer mode

Quando passi `?round=...` e/o `?company=...`:

- trova gli `Offer` che matchano round/impresa
- aggrega `OfferItem` e fa lookup:
  - `EstimateItem` (detailed)
  - `PriceListItem` (aggregated)
  - `WbsNode` (unione WBS da baseline e listino)
- restituisce righe compatibili con la griglia (campo `project.*` usato come “contenitore valori” anche per offerte)

Output (semplificato):

```json
[
  {
    "progressive": 10,
    "code": "ABC-01",
    "description": "Descrizione...",
    "unit_measure": "m",
    "wbs_hierarchy": { "wbs01": "...", "wbs06": "...", "wbs07": "..." },
    "project": { "quantity": 12.5, "unit_price": 10, "amount": 125 }
  }
]
```

## 6.3 — GET `/api/projects/:id/estimate/:estimateId/comparison`

File: `server/api/projects/[id]/estimate/[estimateId]/comparison.get.ts`

Scopo:

- produrre la vista “Confronto” con colonne per impresa.

Filtri:

- `round` (opzionale)
- `company` (opzionale)

Nota:

- restituisce anche `all_rounds` e `all_imprese` per popolare i dropdown senza perdere valori fuori filtro.

## 6.4 — GET `/api/projects/:id/estimates/:estimateId/price-list`

File: `server/api/projects/[id]/estimates/[estimateId]/price-list.get.ts`

Scopo:

- restituire voci di listino con:
  - prezzo
  - totale quantità
  - totale importo
  - WBS6/WBS7 descrittive

Modalità:

- baseline mode (default): totals da `EstimateItem.project.*`
- offer mode: se passi `round`/`company`, totals da `OfferItem` (sia direct PLI che via EstimateItem per detailed)

## 6.5 — GET `/api/projects/:id/estimates/:estimateId/wbs`

File: `server/api/projects/[id]/estimates/[estimateId]/wbs.get.ts`

Scopo:

- restituire la struttura WBS per estimate separando:
  - `spatial` (level <= 5)
  - `wbs6` (level 6)
  - `wbs7` (level 7)

Response:

```json
{
  "project_id": "...",
  "estimate_id": "...",
  "spatial": [ ... ],
  "wbs6": [ ... ],
  "wbs7": [ ... ]
}
```

