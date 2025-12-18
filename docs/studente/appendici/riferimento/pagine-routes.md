# Pagine / Routes (riferimento)

Questo file elenca le pagine Nuxt presenti in `app/pages/` e la navigazione principale.

## Elenco pagine

| URL | File | Note |
|---|---|---|
| `/` | `app/pages/index.vue` | redirect a `/projects` |
| `/projects` | `app/pages/projects/index.vue` | elenco progetti |
| `/projects/:id` | `app/pages/projects/[id]/index.vue` | lista preventivi nel progetto |
| `/projects/:id/import` | `app/pages/projects/[id]/import/index.vue` | import computo + import offerte |
| `/projects/:id/pricelist` | `app/pages/projects/[id]/pricelist/index.vue` | listino (usa `?estimateId=`) |
| `/projects/:id/estimate/:estimateId` | `app/pages/projects/[id]/estimate/[estimateId]/index.vue` | dashboard preventivo (baseline+offerte) |
| `/projects/:id/estimate/:estimateId/detail` | `app/pages/projects/[id]/estimate/[estimateId]/detail.vue` | voci baseline |
| `/projects/:id/estimate/:estimateId/offer` | `app/pages/projects/[id]/estimate/[estimateId]/offer.vue` | voci offerta (usa `?round=&company=`) |
| `/projects/:id/estimate/:estimateId/comparison` | `app/pages/projects/[id]/estimate/[estimateId]/comparison.vue` | confronto (usa `?round=&company=`) |
| `/catalogs` | `app/pages/catalogs/index.vue` | placeholder (cataloghi globali) |

## Query params “ricorrenti”

- `round`: numero round (string/number)
- `company`: nome impresa
- `estimateId`: estimate selezionato per listino (in `/projects/:id/pricelist`)

