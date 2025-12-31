Page Load Report (Nuxt pages)
Scope: app/pages/*.vue and key data-fetching composables/components used on load.

Legend:
- Initial calls: triggered by page mount or awaited useFetch in setup.
- Conditional calls: triggered by watch/onMounted/client-only or user action.

/
File: app/pages/index.vue
Initial calls:
- PUT /api/context/current (setCurrentProject(null))
- GET /api/dashboard/stats (dashboardApi.getStats -> /dashboard/stats)
Notes:
- Dashboard stats are fetched client-side onMounted.

/catalogs
File: app/pages/catalogs/index.vue
Initial calls:
- GET /api/catalog/wbs
- GET /api/catalog/summary
- GET /api/catalog?page=...&pageSize=... (via fetchCatalogRows when grid initializes)
Conditional calls:
- GET /api/catalog/semantic-search?query=... (semantic search when query length >= 3)
- GET /api/catalog with filters/sort/search (grid interactions)
Notes:
- Server-side grid paging; initial row fetch depends on DataGridPage behavior.

/price-estimator
File: app/pages/price-estimator/index.vue
Initial calls:
- None
Conditional calls:
- POST /api/price-estimator/estimate (usePriceEstimator.estimate)

/analytics
File: app/pages/analytics/index.vue
Initial calls:
- POST /api/analytics/global-map (useGlobalAnalytics.fetchMapData onMounted)
Conditional calls:
- POST /api/analytics/global-property-map (when switching to properties mode)
- GET /api/catalog/semantic-search?query=... (map search)
- POST /api/analytics/global-compute-map (recalculate map)
- POST /api/analytics/global-compute-property-map (recalculate property map)
- POST /api/analytics/global-price-analysis (run analysis)
- POST /api/analytics/global-compute-properties (extract properties)
Notes:
- Map payload can be large; this is likely a heavy initial request.

/projects
File: app/pages/projects/index.vue
Initial calls:
- PUT /api/context/current (setCurrentProject(null))
- GET /api/projects?page=1&pageSize=100 (useProjects.fetchProjects)
Conditional calls:
- GET /api/projects with search/sort/filter (grid interactions)

/projects/:id
File: app/pages/projects/[id]/index.vue (Preventivi list)
Initial calls:
- GET /api/projects/:id/context
- GET /api/projects/:id/offers/alerts/summary?group_by=estimate&status=open
- PUT /api/context/current (setProjectState -> syncContext)
Conditional calls:
- GET /api/projects/:id/offers (single call, client-side; used to compute best offer per estimate)
Notes:
- Best-offer stats computed client-side from offers + context totals (N+1 removed).

/projects/:id/pricelist
File: app/pages/projects/[id]/pricelist/index.vue (Listini)
Initial calls:
- GET /api/projects/:id/context
- PUT /api/context/current (setCurrentEstimate)
- GET /api/projects/:id/estimates/:estimateId/price-list (with optional round/company)
- GET /api/projects/:id/offers/pending?estimate_id=... (with optional round/company)
Notes:
- price-list and pending are fetched via watchers and usually run in parallel.

/projects/:id/visualizer
File: app/pages/projects/[id]/visualizer.vue
Initial calls:
- GET /api/projects/:id/analytics/map (useSemanticMap.fetchData onMounted)
Conditional calls:
- POST /api/projects/:id/analytics/compute-umap (recompute map)
- POST /api/analytics/global-map (fetchPoles; runs after map load and on toggle)
- POST /api/projects/:id/analytics/price-analysis (price analysis)
Notes:
- Poles fetch can run more than once (watch + delayed onMounted retry).

/projects/:id/estimate/:estimateId
File: app/pages/projects/[id]/estimate/[estimateId]/index.vue (Ritorni di gara)
Initial calls:
- GET /api/projects/:id/context
- GET /api/projects/:id/offers?estimate_id=...
- GET /api/projects/:id/offers/alerts/summary?group_by=offer&estimate_id=...&status=open
- PUT /api/context/current (setCurrentEstimate)
Conditional calls:
- GET /api/projects/:id/analytics/stats?estimate_id=... (client-only)
- PATCH /api/projects/:id/offers/:offerId (edit offer)
- DELETE /api/projects/:id/offers/:offerId
- DELETE /api/projects/:id/estimates/:estimateId
Notes:
- Stats call adds extra latency after the base data loads.

/projects/:id/estimate/:estimateId/detail
File: app/pages/projects/[id]/estimate/[estimateId]/detail.vue
Shared component: app/components/estimates/EstimateItemsPage.vue
Initial calls:
- PUT /api/context/current (setCurrentEstimate)
- GET /api/projects/:id/estimate/:estimateId
- GET /api/projects/:id/estimate/:estimateId/items (includes query params)
Notes:
- Items refresh on query changes (round/company filters).

/projects/:id/estimate/:estimateId/offer
File: app/pages/projects/[id]/estimate/[estimateId]/offer.vue
Shared component: app/components/estimates/EstimateItemsPage.vue
Initial calls:
- Same as detail page (estimate + items + context sync)

/projects/:id/estimate/:estimateId/comparison
File: app/pages/projects/[id]/estimate/[estimateId]/comparison.vue
Initial calls:
- PUT /api/context/current (setCurrentEstimate)
- GET /api/projects/:id/estimate/:estimateId/comparison?round&company
Notes:
- Re-fetches on round/company filter changes.

/projects/:id/conflicts
File: app/pages/projects/[id]/conflicts/index.vue
Initial calls:
- GET /api/projects/:id/context
- GET /api/projects/:id/offers?estimate_id=... (if estimate filter set)
- GET /api/projects/:id/offers/alerts?estimate_id&offer_id&type&status
- GET /api/projects/:id/offers/pending?estimate_id&round&company (if estimate filter set)
- GET /api/projects/:id/offers/addendum?estimate_id&round&company (if estimate filter set)
Conditional calls:
- PATCH /api/projects/:id/offers/alerts/:alertId (resolve/ignore/reopen)
Notes:
- Multiple parallel queries; initial call set depends on query params (estimateId/all).

/projects/:id/import
File: app/pages/projects/[id]/import/index.vue
Initial calls:
- None (page itself)
Conditional calls:
- POST /api/projects/:id/import-six/preview (SIX preview)
- POST /api/projects/:id/import-six (SIX import)
- POST /api/projects/:id/import-xpwe/preview (XPWE preview)
- POST /api/projects/:id/import-xpwe (XPWE import)
- POST /api/projects/:id/offers (Excel import via ImportWizard)
Notes:
- ImportWizard (app/components/projects/ImportWizard.vue) does GET /api/projects/:id on mount,
  so this call happens when the component is mounted (tab/modal active).

Other notes
- Context sync: setCurrentProject / setCurrentEstimate / setProjectState all call PUT /api/context/current.
- Some pages use useFetch with await in setup, which executes on SSR and on client hydration.
