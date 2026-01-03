# Query Registry

This document lists the available API queries, their IDs, and expected payloads.

## Global Catalog

| Query ID | Endpoint | Description | Payload Budget |
|Path|Path|Description|Size|
|---|---|---|---|
| `catalog.rows.paged` | `/api/q/catalog-rows` | Paged list of catalog items. | Medium |
| `catalog.wbs.summary` | `/api/q/catalog-wbs` | Summary of WBS codes. | Small |
| `catalog.summary` | `/api/q/catalog-summary` | Overall counts and business units. | Tiny |
| `catalog.semantic.search` | `/api/q/catalog-semantic` | Semantic search results. | Medium |

## Project & Estimates

| Query ID | Endpoint | Description | Payload Budget |
|---|---|---|---|
| `project.dashboard` | `/api/q/project-dashboard` | Main dashboard data for a project. | Medium |
| `project.context.light` | `/api/q/project-context` | Lightweight context for headers/switchers. | Small |
| `project.estimate.dashboard` | `/api/q/estimate-dashboard` | Dashboard for a specific estimate. | Medium |
| `project.offers.list` | `/api/q/project-offers` | List of offers for an estimate. | Medium |
| `project.alerts.list` | `/api/q/project-alerts` | Alert summary/list. | Small |
| `estimate.summary` | `/api/q/estimate-summary` | Header info for an estimate. | Tiny |

## Items & Pricelists

| Query ID | Endpoint | Description | Payload Budget |
|---|---|---|---|
| `estimate.items.paged` | `/api/q/estimate-items` | Paged items for an estimate. | Large |
| `estimate.pricelist.paged` | `/api/q/estimate-pricelist` | Paged pricelist items. | Large |
| `estimate.comparison` | `/api/q/estimate-comparison` | Comparison view data. | Large |
