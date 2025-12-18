# 08 — API: Analytics

Questa sezione documenta le API analytics usate dalla dashboard progetto/preventivo.

## 8.1 — GET `/api/projects/:id/analytics/stats?estimate_id=...`

File: `server/api/projects/[id]/analytics/stats.get.ts`

Scopo:

- calcolare totale baseline
- leggere totali offerte dalla testata `Offer`
- restituire:
  - latest round
  - offerte per company/round
  - media ultimo round
  - delta vs progetto

Nota:

- il totale baseline viene calcolato via aggregazione su `EstimateItem` con fallback su prezzo listino.

## 8.2 — GET `/api/projects/:id/analytics/composition?estimate_id=...`

File: `server/api/projects/[id]/analytics/composition.get.ts`

Scopo:

- confronto “composizione” per WBS6:
  - baseline amount per categoria
  - offer amount (ultimissimo round) per categoria

Nota:

- se ci sono più imprese nell’ultimo round, l’endpoint normalizza a **media** (divide per numero offerte).

## 8.3 — GET `/api/projects/:id/analytics/trend?estimate_id=...`

File: `server/api/projects/[id]/analytics/trend.get.ts`

Scopo:

- trend per round:
  - totali per impresa
  - media round
- include sempre `project_total` baseline

