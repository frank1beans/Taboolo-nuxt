# API Routes (riferimento)

Questo file elenca le route Nitro presenti in `server/api/`.

> Nota: la lista è “descrittiva” (path e metodi). I dettagli (request/response) sono nel riferimento tecnico.

## Convenzioni

- Base path: `/api`
- Segmenti dinamici:
  - `:id` = projectId (Mongo ObjectId string)
  - `:estimateId` = estimateId (Mongo ObjectId string)
  - `:offerId` = offerId (Mongo ObjectId string)
  - `:itemId` = offer item id (Mongo ObjectId string)

## Elenco route

| Metodo | Path | File |
|---:|---|---|
| GET | `/api/catalog` | `server/api/catalog/index.get.ts` |
| GET | `/api/context/current` | `server/api/context/current.get.ts` |
| PUT | `/api/context/current` | `server/api/context/current.put.ts` |
| GET | `/api/dashboard/stats` | `server/api/dashboard/stats.get.ts` |
| GET | `/api/debug-env` | `server/api/debug-env.get.ts` |
| GET | `/api/debug-inspect` | `server/api/debug-inspect.get.ts` |
| GET | `/api/projects` | `server/api/projects/index.get.ts` |
| POST | `/api/projects` | `server/api/projects/index.post.ts` |
| GET | `/api/projects/:id` | `server/api/projects/[id].get.ts` |
| PUT | `/api/projects/:id` | `server/api/projects/[id].put.ts` |
| DELETE | `/api/projects/:id` | `server/api/projects/[id].delete.ts` |
| GET | `/api/projects/:id/context` | `server/api/projects/[id]/context.get.ts` |
| POST | `/api/projects/:id/import-six/preview` | `server/api/projects/[id]/import-six/preview.post.ts` |
| POST | `/api/projects/:id/import-six` | `server/api/projects/[id]/import-six.post.ts` |

| POST | `/api/projects/:id/offers` | `server/api/projects/[id]/offers.post.ts` |
| PATCH | `/api/projects/:id/offers/:offerId` | `server/api/projects/[id]/offers/[offerId].patch.ts` |
| DELETE | `/api/projects/:id/offers/:offerId` | `server/api/projects/[id]/offers/[offerId].delete.ts` |
| GET | `/api/projects/:id/offers/pending` | `server/api/projects/[id]/offers/pending.get.ts` |
| PATCH | `/api/projects/:id/offers/items/:itemId` | `server/api/projects/[id]/offers/items/[itemId].patch.ts` |
| POST | `/api/projects/:id/offers/batch-single-file` | `server/api/projects/[id]/offers/batch-single-file.post.ts` |
| GET | `/api/projects/:id/analytics/stats` | `server/api/projects/[id]/analytics/stats.get.ts` |
| GET | `/api/projects/:id/analytics/composition` | `server/api/projects/[id]/analytics/composition.get.ts` |
| GET | `/api/projects/:id/analytics/trend` | `server/api/projects/[id]/analytics/trend.get.ts` |
| GET | `/api/projects/:id/estimate/:estimateId` | `server/api/projects/[id]/estimate/[estimateId].get.ts` |
| GET | `/api/projects/:id/estimate/:estimateId/items` | `server/api/projects/[id]/estimate/[estimateId]/items.get.ts` |
| GET | `/api/projects/:id/estimate/:estimateId/comparison` | `server/api/projects/[id]/estimate/[estimateId]/comparison.get.ts` |
| GET | `/api/projects/:id/estimate/:estimateId/debug-wbs` | `server/api/projects/[id]/estimate/[estimateId]/debug-wbs.get.ts` |
| DELETE | `/api/projects/:id/estimates/:estimateId` | `server/api/projects/[id]/estimates/[estimateId].delete.ts` |
| GET | `/api/projects/:id/estimates/:estimateId/price-list` | `server/api/projects/[id]/estimates/[estimateId]/price-list.get.ts` |
| GET | `/api/projects/:id/estimates/:estimateId/wbs` | `server/api/projects/[id]/estimates/[estimateId]/wbs.get.ts` |
| POST | `/api/projects/:id/project-estimate` | `server/api/projects/[id]/project-estimate.post.ts` |
| GET | `/api/projects/:id/project-estimates` | `server/api/projects/[id]/project-estimates.get.ts` |
| GET | `/api/projects/:id/price-catalog` | `server/api/projects/[id]/price-catalog.get.ts` |
| GET | `/api/projects/:id/wbs` | `server/api/projects/[id]/wbs/index.get.ts` |
| POST | `/api/projects/:id/wbs/upload` | `server/api/projects/[id]/wbs/upload.post.ts` |

## Note rapide (per non tecnici)

- Le route `import-six*` e `offers*` dipendono da un servizio Python esterno.
- Le route `debug-*` sono pensate per diagnosi e possono essere rimosse/limitare in produzione.

