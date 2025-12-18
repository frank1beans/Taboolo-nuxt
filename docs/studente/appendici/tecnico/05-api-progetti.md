# 05 — API: Progetti e contesto

Questa sezione documenta le API Nitro relative a progetti e contesto utente.

> Base: `/api`

## 5.1 — GET `/api/projects`

File: `server/api/projects/index.get.ts`

Scopo:

- elencare i progetti con paginazione, ordinamento e filtri.

Query params:

- `page` (default 1)
- `pageSize` (default 50)
- `sort` (default `created_at`)
- `order` (`asc`/`desc`, default `desc`)
- `search` (ricerca testuale su `code`, `name`, `description`, `business_unit`)
- `filters` (JSON string: modello filtri DataGrid)

Response:

```json
{
  "data": [ { "id": "...", "name": "...", "code": "...", "status": "setup" } ],
  "total": 123,
  "page": 1,
  "pageSize": 50,
  "totalPages": 3
}
```

## 5.2 — POST `/api/projects`

File: `server/api/projects/index.post.ts`

Body (minimo):

```json
{ "name": "Commessa X", "code": "COMMESSA-X" }
```

Errori:

- `400` se mancano `name` o `code`
- `409` se `code` è duplicato (unique index)

## 5.3 — GET `/api/projects/:id`

File: `server/api/projects/[id].get.ts`

Scopo:

- recuperare dettaglio progetto + estimates (arricchiti con rounds/companies) usando le offerte presenti.

Nota:

- restituisce anche `estimates` con:
  - `rounds` (solo metadata)
  - `companies` (solo metadata)
  - `roundsCount`, `companiesCount`

## 5.4 — PUT `/api/projects/:id`

File: `server/api/projects/[id].put.ts`

Scopo:

- aggiornare i campi del progetto (patch-like con `$set`).

Errori:

- `404` se progetto non esiste
- `409` se `code` duplicato

## 5.5 — DELETE `/api/projects/:id`

File: `server/api/projects/[id].delete.ts`

Scopo:

- eliminare un progetto e tutti i suoi dati collegati.

Comportamento:

- per ogni estimate del progetto chiama `deleteEstimateCascade(projectId, estimateId)`
- elimina il progetto

## 5.6 — GET `/api/projects/:id/context`

File: `server/api/projects/[id]/context.get.ts`

Scopo:

- fornire al frontend un “contesto” già pronto:
  - progetto
  - estimates
  - round → imprese (gerarchia)
  - totali baseline calcolati da `EstimateItem`

È l’endpoint più usato dal frontend per le pagine:

- dashboard progetto
- selettori e breadcrumb contestuali

Nota sui totali:

- calcola `totalAmount` via aggregazione su `EstimateItem`
- fa lookup su `PriceListItem` per ricostruire l’importo quando non è salvato

## 5.7 — Contesto utente (persistenza selezioni)

Endpoint:

- `GET /api/context/current` → `server/api/context/current.get.ts`
- `PUT /api/context/current` → `server/api/context/current.put.ts`

Scopo:

- salvare/ripristinare “ultimo progetto” e “ultimo preventivo” selezionati.

Scope (attuale):

- `x-user-id` header (default `demo-user`)
- `x-org-id` header (default `null`)

