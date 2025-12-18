# 00 — Panorama architettura

Questo capitolo descrive l’architettura del progetto, le responsabilità dei moduli e i flussi principali.

## 0.1 — Stack

- **Frontend**: Nuxt (Vue 3) in `app/`
  - UI basata su `@nuxt/ui`, AG Grid, composables
- **Backend**: Nuxt Nitro (API server-side) in `server/api/`
  - logica DB via Mongoose in `server/models/` + `server/services/`
- **Database**: MongoDB
  - connessione in `server/plugins/mongoose.ts`
- **Importer**: servizio Python esterno
  - chiamato via proxy multipart (`server/utils/python-proxy.ts`)
  - client specifico per SIX in `server/importers/python-six/client.ts`

## 0.2 — Cartelle chiave

### Frontend

- `app/pages/` → route Nuxt
- `app/components/` → componenti UI riutilizzabili
- `app/composables/` → logica condivisa (filtri WBS, contesto progetto, ecc.)
- `app/lib/api-client.ts` → client HTTP verso `/api/*`
- `app/types/api.ts` → contratti TypeScript per payload API (lato frontend)

### Backend

- `server/api/` → route Nitro (REST-like)
- `server/models/` → schemi Mongoose (Mongo)
- `server/services/` → servizi applicativi (import, delete cascade, update offer)
- `server/utils/` → utilità (serialize, normalize, proxy python, mappers)
- `server/plugins/mongoose.ts` → bootstrap connessione DB

## 0.3 — “Per-estimate namespace” (concetto chiave)

Uno dei punti architetturali principali è che **WBS e listino sono per-estimate**.

In pratica:

- `WbsNode` ha `estimate_id` obbligatorio
- `PriceListItem` ha `estimate_id` obbligatorio
- `EstimateItem` è legato a `project.estimate_id` (baseline)

Questo evita collisioni quando un progetto contiene più preventivi.

## 0.4 — Flussi principali (overview)

### A) Import computo SIX/XML (baseline)

1) Frontend invia file a `POST /api/projects/:id/import-six?mode=raw`
2) Nitro fa proxy al servizio Python
3) Nitro persiste in Mongo: WBS + listino + voci + testata preventivo

### B) Import offerta Excel

1) Frontend invia file a `POST /api/projects/:id/offers?...` con multipart + query
2) Nitro fa proxy al servizio Python (ritorni)
3) Nitro persiste `Offer` + `OfferItem` e collega alla baseline scelta (o dedotta)

### C) Consultazione / analisi

- Dashboard progetto: `GET /api/projects/:id/context` + `GET /api/projects/:id/analytics/stats`
- Dashboard preventivo: `GET /api/projects/:id/offers?estimate_id=...` + stats
- Dettaglio voci: `GET /api/projects/:id/estimate/:estimateId/items` (baseline o offer mode via query)
- Listino: `GET /api/projects/:id/estimates/:estimateId/price-list` (baseline o offer mode via query)
- Confronto: `GET /api/projects/:id/estimate/:estimateId/comparison`

## 0.5 — Diagramma (alto livello)

```flowchart
flowchart LR
  UI[Frontend Nuxt\napp/] -->|fetch| API[Nitro API\nserver/api/]
  API -->|Mongoose| DB[(MongoDB)]
  API -->|multipart proxy| PY[Python Importer\n(PYTHON_API_URL)]
  UI -->|filtri round/company| API
```

## 0.6 — Criteri di “stabilità” per la documentazione

Per evitare documentazione che invecchia subito, in questa cartella consideriamo “stabili”:

- schema Mongo e relazioni principali
- import SIX Raw + persistenza
- import offerte Excel + pending resolution
- endpoint di lettura per dashboard/listino/confronto/analytics

Sono invece “in evoluzione”:

- cataloghi globali (`/catalogs`) e alcune funzionalità secondarie non ancora integrate end-to-end.
