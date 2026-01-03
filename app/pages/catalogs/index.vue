<script setup lang="ts">
/**
 * Global Price Catalog (All Projects)
 *
 * Mirrors the project price list layout, but aggregates items across projects
 * and adds a Project column for quick identification.
 */

import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import type { GridApi } from 'ag-grid-community'
import type { DataGridConfig, DataGridFetchParams } from '~/types/data-grid'
import type { ApiPriceCatalogSummary, ApiPriceListItem, ApiPriceListItemSearchResult } from '~/types/api'
import DataGridPage from '~/components/layout/DataGridPage.vue'
import PageToolbar from '~/components/layout/PageToolbar.vue'
import { usePriceListGridConfig } from '~/composables/estimates/usePriceListGridConfig'
import { useSidebarModules, usePageSidebarModule } from '~/composables/useSidebarModules'
import WbsModule from '~/components/sidebar/modules/WbsModule.vue'
import { useWbsTree } from '~/composables/useWbsTree'
// import { catalogApi } from '~/lib/api/catalog' // Replaced by queryApi
import { queryApi } from '~/utils/queries'
import { QueryKeys } from '~/types/queries'
import { useActionsStore } from '~/stores/actions'
import type { Action } from '~/types/actions'

// Standardized header: removed breadcrumb
definePageMeta({
  disableDefaultSidebar: true,
})

const _colorMode = useColorMode()
const { toggleVisibility, isVisible: sidebarVisible, setActiveModule, showSidebar } = useSidebarModules()

type CatalogWbsEntry = {
  wbs6_code?: string | null
  wbs6_description?: string | null
  wbs7_code?: string | null
  wbs7_description?: string | null
  wbs_hierarchy?: Record<string, string | undefined> // Satisfy WithWbsHierarchy
}
type WbsTreeItem = ApiPriceListItem | CatalogWbsEntry

type CatalogRowParams = { data?: ApiPriceListItem }

const serverTotal = ref(0)
const gridApi = ref<GridApi | null>(null)
const { exportToXlsx } = useDataGridExport(gridApi)
const actionsStore = useActionsStore()
// actionOwner already defined below? No, I see it defined at line 46 and 48?
// The file view showed:
// 46: const actionOwner = 'page:catalogs-index'
// 48: const actionOwner = 'page:catalogs-index'
// I will remove the first occurrence or just deduplicate.
// Replaces lines 46-50.
const actionOwner = 'page:catalogs-index'

const { data: wbsRes } = await useAsyncData('catalog-wbs', () => queryApi.fetch(QueryKeys.CATALOG_WBS_SUMMARY, {}))
const { data: catalogSummary } = await useAsyncData('catalog-summary', () => queryApi.fetch(QueryKeys.CATALOG_SUMMARY, {}))

const wbsEntries = computed(() => wbsRes.value?.items ?? [])

const searchText = ref('')
const debouncedSearch = ref('')
const semanticResults = ref<ApiPriceListItemSearchResult[]>([])
const semanticLoading = ref(false)
const lastSemanticQuery = ref('')

const MIN_SEMANTIC_QUERY = 3
const SEMANTIC_TOP_K = 80

let searchTimer: ReturnType<typeof setTimeout> | null = null
let searchToken = 0

watch(searchText, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedSearch.value = value
  }, 220)
})

const isSemanticSearch = computed(() => debouncedSearch.value.trim().length >= MIN_SEMANTIC_QUERY)
const gridFilterText = computed(() => (isSemanticSearch.value ? '' : searchText.value))

const baseRowData = computed<ApiPriceListItem[]>(() => [])
const rowData = computed<ApiPriceListItem[]>(() => (isSemanticSearch.value ? semanticResults.value : baseRowData.value))
const loading = computed(() => semanticLoading.value)

const runSemanticSearch = async (query: string) => {
  if (query === lastSemanticQuery.value) return
  const token = ++searchToken
  semanticLoading.value = true
  semanticResults.value = []

  try {
    const response = await queryApi.fetch(QueryKeys.CATALOG_SEMANTIC_SEARCH, {
      query,
      limit: SEMANTIC_TOP_K,
      // threshold?
    })
    const results = response.items
    if (token !== searchToken) return
    semanticResults.value = results as unknown as ApiPriceListItemSearchResult[]
    lastSemanticQuery.value = query
  } catch {
    if (token !== searchToken) return
    semanticResults.value = []
    lastSemanticQuery.value = ''
  } finally {
    if (token === searchToken) semanticLoading.value = false
  }
}

watch(debouncedSearch, (value) => {
  const query = value.trim()
  if (query.length < MIN_SEMANTIC_QUERY) {
    semanticResults.value = []
    semanticLoading.value = false
    lastSemanticQuery.value = ''
    return
  }
  runSemanticSearch(query)
})

const clearSemanticSearch = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = null
  debouncedSearch.value = ''
  semanticResults.value = []
  semanticLoading.value = false
  lastSemanticQuery.value = ''
}

const wbsTreeSource = computed<WbsTreeItem[]>(() => (wbsEntries.value ?? []))
const wbsTreeInput = computed<WbsTreeItem[]>(() => (isSemanticSearch.value ? rowData.value : wbsTreeSource.value))

const {
  wbsNodes,
  selectedWbsNode,
  filteredRowData,
  onWbsNodeSelected,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} = useWbsTree(wbsTreeInput as any, {
  getLevels: (item: WbsTreeItem) => {
    const levels: { code: string; name?: string; level?: number }[] = []
    if (item.wbs6_code && item.wbs6_description) {
      levels.push({ code: item.wbs6_code, name: item.wbs6_description, level: 6 })
    }
    if (item.wbs7_code && item.wbs7_description) {
      levels.push({ code: item.wbs7_code, name: item.wbs7_description, level: 7 })
    }
    return levels
  },
})

const gridRowData = computed<ApiPriceListItem[]>(() => (isSemanticSearch.value ? filteredRowData.value as ApiPriceListItem[] : rowData.value))
const { gridConfig: baseGridConfig } = usePriceListGridConfig(gridRowData)

const gridConfig = computed<DataGridConfig>(() => {
  const projectColumn = {
    field: 'project_name',
    headerName: 'Progetto',
    width: 180,
    pinned: 'left' as const,
     
    valueGetter: (params: CatalogRowParams) => {
      const data = params?.data
      if (!data) return ''
      if (data.project_code && data.project_name) {
        return `${data.project_code} • ${data.project_name}`
      }
      return data.project_name || data.project_code || '-'
    },
  }

  const columns = baseGridConfig.columns.map((col) => {
    if (col.field === 'total_quantity' || col.field === 'total_amount') {
      return { ...col, hide: true }
    }
    return col
  })
  const codeIdx = columns.findIndex((col) => col.field === 'code')
  const insertIdx = codeIdx >= 0 ? codeIdx + 1 : 1
  columns.splice(insertIdx, 0, projectColumn)

  return {
    ...baseGridConfig,
    columns,
  }
})



const itemCount = computed(() => (isSemanticSearch.value ? gridRowData.value.length : serverTotal.value))

const projectCount = computed(() => {
  if (isSemanticSearch.value) {
    const projects = new Set(filteredRowData.value.map((i) => i.project_id).filter(Boolean));
    return projects.size;
  }
  return catalogSummary.value?.total_projects ?? 0;
});


const handleReset = () => {
  searchText.value = ''
  clearSemanticSearch()
  onWbsNodeSelected(null)
  gridApi.value?.setFilterModel(null)
  gridApi.value?.onFilterChanged?.()
}

const registerAction = (action: Action) => {
  actionsStore.registerAction(action, { owner: actionOwner, overwrite: true })
}

onMounted(() => {
  registerAction({
    id: 'grid.exportExcel',
    label: 'Esporta in Excel',
    description: 'Esporta dati in Excel',
    category: 'Tabelle',
    scope: 'selection',
    icon: 'i-heroicons-arrow-down-tray',
    keywords: ['export', 'excel', 'tabella'],
    handler: () => exportToXlsx('listino-globale'),
  })

  registerAction({
    id: 'catalog.resetFilters',
    label: 'Reset filtri catalogo',
    description: 'Pulisce ricerca e filtri del catalogo',
    category: 'Cataloghi',
    scope: 'global',
    icon: 'i-heroicons-arrow-path',
    keywords: ['reset', 'filtri', 'catalogo'],
    handler: () => handleReset(),
  })

  registerAction({
    id: 'catalog.toggleWbsSidebar',
    label: 'Mostra/Nascondi WBS',
    description: 'Attiva o disattiva la sidebar WBS',
    category: 'Cataloghi',
    scope: 'global',
    icon: 'i-heroicons-view-columns',
    keywords: ['wbs', 'sidebar'],
    handler: () => toggleWbsSidebar(),
  })

  registerAction({
    id: 'catalog.clearWbsSelection',
    label: 'Rimuovi filtro WBS',
    description: 'Deseleziona il nodo WBS attivo',
    category: 'Cataloghi',
    scope: 'selection',
    icon: 'i-heroicons-x-mark',
    keywords: ['wbs', 'filtro'],
    handler: () => onWbsNodeSelected(null),
  })
})

onUnmounted(() => {
  actionsStore.unregisterOwner(actionOwner)
})

// Register WBS Module using the route-scoped helper
usePageSidebarModule({
  id: 'wbs',
  label: 'WBS',
  icon: 'heroicons:squares-2x2',
  component: WbsModule,
  props: {
    nodes: wbsNodes,
    selectedNodeId: computed(() => selectedWbsNode.value?.id ?? null),
    onNodeSelected: (node: WbsTreeItem | null) => onWbsNodeSelected(node),
  }
})

const toggleWbsSidebar = () => {
  if (!sidebarVisible.value) {
    setActiveModule('wbs')
    showSidebar()
  } else {
    toggleVisibility()
  }
}

const fetchCatalogRows = async (params: DataGridFetchParams) => {
  const sortModel = params.sortModel?.[0] as { colId?: string; sort?: 'asc' | 'desc' } | undefined
  
  // Map grid filters to query Params
  const wbs6 = [] as string[];
  const wbs7 = [] as string[];
  // Extract WBS filters from params.filterModel if present (custom logic might be needed if complex)
  // Current implementation uses custom applyWbsFilter which sets `wbs6_code` and `wbs7_code` in filterModel.
  
  const filters: any = params.filterModel || {};
  if (filters.wbs6_code) wbs6.push(filters.wbs6_code.filter);
  if (filters.wbs7_code) wbs7.push(filters.wbs7_code.filter);

  const response = await queryApi.fetch(QueryKeys.CATALOG_ROWS_PAGED, {
    page: params.page,
    limit: params.pageSize,
    search: params.quickFilter,
    sort: sortModel ? (sortModel.sort === 'desc' ? '-' : '') + sortModel.colId : undefined,
    wbs6: wbs6.length ? wbs6 : undefined,
    wbs7: wbs7.length ? wbs7 : undefined,
    // Add business_unit key if filtered?
  })
  
  serverTotal.value = response.total
  return {
     rows: response.items,
     total: response.total
  }
}

const applyWbsFilter = (node: typeof selectedWbsNode.value) => {
  const api = gridApi.value as {
    getFilterModel?: () => Record<string, unknown>;
    setFilterModel?: (model: Record<string, unknown>) => void;
    onFilterChanged?: () => void;
  } | null
  if (!api?.setFilterModel || !api.onFilterChanged) return

  const model = api.getFilterModel ? { ...api.getFilterModel() } : {}
  delete model.wbs6_code
  delete model.wbs7_code

  if (node) {
    const segments = node.id.split('/')
    if (segments[0]) {
      model.wbs6_code = { filterType: 'text', type: 'equals', filter: segments[0] }
    }
    if (segments[1]) {
      model.wbs7_code = { filterType: 'text', type: 'equals', filter: segments[1] }
    }
  }

  api.setFilterModel(model)
  api.onFilterChanged()
}

const onGridReady = (params: { api: unknown }) => {
  gridApi.value = params.api
  applyWbsFilter(selectedWbsNode.value)
}

watch(selectedWbsNode, (node) => {
  applyWbsFilter(node)
})
</script>

<template>
  <DataGridPage
    :key="isSemanticSearch ? 'semantic' : 'server'"
    title="Listino Globale"
    :grid-config="gridConfig"
    :row-data="gridRowData as any"
    :loading="loading"
    empty-state-title="Nessuna voce trovata"
    empty-state-message="Il catalogo globale non contiene ancora voci."
    :show-toolbar="false"
    :filter-text="gridFilterText"
    :fetch-rows="isSemanticSearch ? undefined : fetchCatalogRows"
    :cache-block-size="200"
    @grid-ready="onGridReady"
  >
    <!-- Meta Info: Counts -->
    <template #header-meta>
       <div class="flex items-center gap-2">
         <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
            {{ itemCount }} voci
         </span>
         <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
            {{ projectCount }} progetti
         </span>
       </div>
    </template>


    <!-- Header Actions: Primary Page Actions -->
    <template #actions>
      <ActionList
        layout="toolbar"
        :action-ids="['catalog.toggleWbsSidebar']"
      />
    </template>

    <!-- Toolbar: Search & Grid Actions -->
    <template #pre-grid>
      <ClientOnly>
        <Teleport to="#topbar-actions-portal">
        <PageToolbar
          v-model="searchText"
          search-placeholder="Cerca voce..."
          class="!py-0"
        >
          <template #left>
             <!-- WBS Filter Chip in Toolbar -->
             <UBadge v-if="selectedWbsNode" color="primary" variant="soft" class="gap-1.5 pl-2 pr-1 py-1 ml-2">
                <Icon name="heroicons:funnel-solid" class="w-3.5 h-3.5" />
                <span class="max-w-48 truncate">{{ selectedWbsNode.name }}</span>
                <UButton
                  icon="i-heroicons-x-mark"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  title="Rimuovi filtro WBS"
                  class="hover:bg-[hsl(var(--primary)/0.2)]"
                  @click="actionsStore.executeAction('catalog.clearWbsSelection')"
                />
              </UBadge>
          </template>

          <template #right>
            <ActionList
              layout="toolbar"
              :action-ids="['catalog.resetFilters', 'grid.exportExcel']"
            />
          </template>
        </PageToolbar>
        </Teleport>
      </ClientOnly>
    </template>
  </DataGridPage>
</template>
