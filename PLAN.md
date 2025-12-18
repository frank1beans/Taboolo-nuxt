# Implementation Plan: WBS & Price List per Estimate

- [x] Define shared contract types (TS) for WbsNode, PriceList, PriceListItem, EstimateItem with uniform fields: `project_id`, `estimate_id`, `price_list_id`, `code`, `short_description`, `long_description`, `unit`, `price`, `wbs_ids`, `quantity`, `unit_price`, `amount`.
- [x] Rename endpoints for per-estimate resources: `/api/projects/:projectId/estimates/:estimateId/price-list` and `/api/projects/:projectId/estimates/:estimateId/wbs`; deprecate old `/price-catalog`.
- [x] Align Python → Nitro mappers to emit/consume the contract names (remove legacy aliases). *(estimate/raw descriptions normalized via normalizeTextFields)*
- [x] Centralize builders: WBS upsert per estimate; PriceList/PriceListItem upsert per estimate; shared pipeline helper for estimate items/analytics. *(normalizeTextFields centralized)*
- [x] Add delete cascade helper for estimate (items, price list, price list items, WBS, estimate) and reuse in project delete.
- [x] Frontend updates: use new endpoints with `estimateId`, show short/long description consistently; WBS tree uses per-estimate endpoint.
- [x] Validation & fallbacks: enforce `estimate_id` required for listino/WBS/analytics; fallback long_description -> short_description -> code in imports; trim verbose logs on hot paths.
