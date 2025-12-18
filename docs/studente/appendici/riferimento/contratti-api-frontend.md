# Contratti API (frontend) — riferimento rapido

Questa sezione riassume i payload principali usati dal frontend nelle aree “stabili”.

> Fonte types: `app/types/api.ts` (il file contiene anche tipi legacy/non usati in tutte le viste).

## Progetto (contesto)

In molte pagine, il frontend usa `GET /api/projects/:id/context` e tratta il payload come “Project con estimates”.

Campi rilevanti (vista dashboard):

- `id`, `name`, `code`, `status`
- `estimates[]` con:
  - `id`, `name`
  - `rounds[]` (id/name + companies)
  - `companies[]` (flatten)
  - `roundsCount`, `companiesCount`
  - `totalAmount`

## Voci (Dettaglio Preventivo/Offerta)

La griglia usa un shape compatibile con `EstimateItem` (frontend composable `useEstimateGridConfig`):

- `progressive` (number)
- `code` (string)
- `description` (string)
- `unit_measure` (string)
- `wbs_hierarchy` (oggetto con `wbs01`..`wbs07`)
- `project.quantity`, `project.unit_price`, `project.amount`

Nota:

- in “offerta mode” i valori dell’offerta vengono esposti comunque dentro `project.*` per riusare la stessa griglia.

## Listino

La griglia listino usa principalmente:

- `code`, `description`, `unit`, `price`
- `wbs6_code`, `wbs6_description`, `wbs7_code`, `wbs7_description`
- `total_quantity`, `total_amount`

Questi campi sono prodotti dall’aggregazione `GET /api/projects/:id/estimates/:estimateId/price-list`.

