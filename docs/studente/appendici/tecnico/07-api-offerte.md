# 07 — API: Offerte

Questa sezione documenta le API offerte (testate e righe).

## 7.1 — GET `/api/projects/:id/offers`

File: `server/api/projects/[id]/offers/index.get.ts`

Query:

- `estimate_id` (opzionale): baseline estimate a cui sono collegate le offerte

Response:

```json
{ "offers": [ { "id": "...", "round_number": 1, "company_name": "Impresa", "mode": "detailed" } ] }
```

## 7.2 — POST `/api/projects/:id/offers` (import)

File: `server/api/projects/[id]/offers.post.ts`

Scopo:

- importare offerta da Excel passando dal Python importer.

Input:

- multipart form (file + parametri)
- query string duplicata (estimate_id, company, round_number, mode) per evitare lettura doppia del body

Nota:

- il mapping dei campi è gestito da `fieldMap`/`valueMap`
- la persistenza effettiva è `persistOffer(...)`

## 7.3 — PATCH `/api/projects/:id/offers/:offerId`

File: `server/api/projects/[id]/offers/[offerId].patch.ts`

Scopo:

- aggiornare metadati offerta (nome, impresa, round, stato, mode, totale, descrizione, data).

Validazioni:

- projectId e offerId devono essere ObjectId validi
- campi ammessi e normalizzazioni sono in `server/services/OfferService.ts`

## 7.4 — DELETE `/api/projects/:id/offers/:offerId`

File: `server/api/projects/[id]/offers/[offerId].delete.ts`

Scopo:

- eliminare offerta e righe collegate (`deleteOfferCascade`).

## 7.5 — GET `/api/projects/:id/offers/pending`

File: `server/api/projects/[id]/offers/pending.get.ts`

Scopo:

- recuperare righe offerta “pending” (ambigue/non risolte) con candidati PLI.

Query (obbligatorio):

- `estimate_id` (baseline estimate)

Query (opzionali):

- `round`
- `company`

Response (semplificata):

```json
{
  "items": [
    {
      "id": "...",
      "description": "…",
      "quantity": 10,
      "unit_price": 5,
      "candidates": [ { "id": "...", "code": "X", "description": "…" } ]
    }
  ]
}
```

## 7.6 — PATCH `/api/projects/:id/offers/items/:itemId` (resolve pending)

File: `server/api/projects/[id]/offers/items/[itemId].patch.ts`

Body:

```json
{ "price_list_item_id": "ObjectId string" }
```

Effetto:

- imposta `OfferItem.price_list_item_id`
- svuota `candidate_price_list_item_ids`
- `resolution_status = resolved`
- `origin = baseline`

## 7.7 — POST `/api/projects/:id/offers/batch-single-file`

File: `server/api/projects/[id]/offers/batch-single-file.post.ts`

Scopo:

- importare più imprese/round da **un solo** Excel usando endpoint Python batch.

Nota:

- persiste ogni offerta con `persistOffer` iterando sugli estimates ritornati.

