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
import { usePageSidebarModule, useSidebarModules } from '~/composables/useSidebarModules'
import WbsModule from '~/components/sidebar/modules/WbsModule.vue'
import ItemDetailModule from '~/components/sidebar/modules/ItemDetailModule.vue'
import { useWbsTree } from '~/composables/useWbsTree'
import { useActionsStore } from '~/stores/actions'
import { useSelectionStore } from '~/stores/selection'
import type { Action } from '~/types/actions'
import SidebarActionsModule from '~/components/sidebar/modules/SidebarActionsModule.vue'
import * as XLSX from 'xlsx'
import type { WbsNode } from '~/types/wbs'

// Standardized header: removed breadcrumb
definePageMeta({
  disableDefaultSidebar: true,
})

const _colorMode = useColorMode()

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
const selectionStore = useSelectionStore()
const selectionKey = 'catalog'
const selectedRows = computed(() => selectionStore.getSelection(selectionKey) as ApiPriceListItem[])
const selectedCount = computed(() => selectedRows.value.length)
const detailItem = ref<ApiPriceListItem | null>(null)
const { isVisible: sidebarVisible, setActiveModule, showSidebar, hideSidebar, activeModuleId } = useSidebarModules()

const openDetail = (row: any) => {
  if (!row) return
  
  // Toggle logic: if clicking the same row that is already detail-active, close it
  const isCurrentlyOpen = detailItem.value && detailItem.value.id === row.id && 
                          sidebarVisible.value && activeModuleId.value === 'details'
  
  if (isCurrentlyOpen) {
    detailItem.value = null
    return
  }

  detailItem.value = row
  if (sidebarVisible.value && activeModuleId.value === 'details') {
    // Already open
  } else {
    setActiveModule('details')
    showSidebar()
  }
}

// Ensure rows update when detail item changes (for highlighting)
watch(detailItem, () => {
    if (gridApi.value) {
        gridApi.value.redrawRows()
    }
})

const { data: wbsRes } = await useAsyncData('catalog-wbs', () => $fetch<CatalogWbsEntry[]>('/api/catalog/wbs'))
const { data: catalogSummary } = await useAsyncData('catalog-summary', () => $fetch<ApiPriceCatalogSummary>('/api/catalog/summary'))

const wbsEntries = computed(() => wbsRes.value ?? [])
const wbsOptionsByField = computed(() => {
  const buildOptions = (field: keyof CatalogWbsEntry) => {
    const seen = new Set<string>()
    const list: string[] = []
    for (const entry of wbsEntries.value) {
      const raw = entry[field]
      if (!raw) continue
      const value = String(raw).trim()
      if (!value || seen.has(value)) continue
      seen.add(value)
      list.push(value)
    }
    return list.sort((a, b) => a.localeCompare(b))
  }

  return {
    wbs6_code: buildOptions('wbs6_code'),
    wbs6_description: buildOptions('wbs6_description'),
    wbs7_code: buildOptions('wbs7_code'),
    wbs7_description: buildOptions('wbs7_description'),
  }
})

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
    const results = await $fetch<ApiPriceListItemSearchResult[]>('/api/catalog/semantic-search', {
      query: {
        query,
        top_k: SEMANTIC_TOP_K,
      },
    })
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

const SET_FILTER_PREFIX = '__set__:'

const encodeSetFilter = (values: string[]) => `${SET_FILTER_PREFIX}${JSON.stringify(values)}`

const decodeSetFilter = (raw: unknown): string[] | null => {
  if (typeof raw !== 'string' || !raw.startsWith(SET_FILTER_PREFIX)) return null
  try {
    const parsed = JSON.parse(raw.slice(SET_FILTER_PREFIX.length))
    if (!Array.isArray(parsed)) return null
    return parsed.map((val) => String(val))
  } catch {
    return null
  }
}

type FilterModelEntry = { type?: string; filter?: unknown; filterType?: string }
const MULTI_VALUE = Symbol('multi')
type SingleFilterValue = string | null | typeof MULTI_VALUE

const getSingleFilterValue = (entry?: FilterModelEntry | null): SingleFilterValue => {
  if (!entry || typeof entry !== 'object') return null
  if (entry.type && entry.type !== 'equals') return null
  const setValues = decodeSetFilter(entry.filter)
  if (setValues) {
    if (setValues.length === 1) return setValues[0] ?? null
    return MULTI_VALUE
  }
  if (entry.filter === null || entry.filter === undefined || entry.filter === '') return null
  return String(entry.filter)
}

const wbsIndex = computed(() => {
  const byId = new Map<string, WbsNode>()
  const level6ByName = new Map<string, WbsNode[]>()
  const level7ByName = new Map<string, WbsNode[]>()
  const level7ByCode = new Map<string, WbsNode[]>()

  const addTo = (map: Map<string, WbsNode[]>, key: string | undefined, node: WbsNode) => {
    if (!key) return
    const list = map.get(key) ?? []
    list.push(node)
    map.set(key, list)
  }

  const walk = (nodes: WbsNode[]) => {
    nodes.forEach((node) => {
      byId.set(node.id, node)
      if (node.level === 6) {
        addTo(level6ByName, node.name || '', node)
      }
      if (node.level === 7) {
        const parts = node.id.split('/')
        const wbs7Code = parts[1]
        addTo(level7ByCode, wbs7Code, node)
        addTo(level7ByName, node.name || '', node)
      }
      if (node.children?.length) walk(node.children)
    })
  }

  walk(wbsNodes.value)
  return { byId, level6ByName, level7ByName, level7ByCode }
})

const pickSingleNodeId = (nodes?: WbsNode[]) =>
  nodes && nodes.length === 1 ? nodes[0]?.id ?? null : null

const resolveWbsIdFromFilters = (model: Record<string, FilterModelEntry>) => {
  const wbs6Code = getSingleFilterValue(model.wbs6_code)
  const wbs7Code = getSingleFilterValue(model.wbs7_code)
  const wbs6Desc = getSingleFilterValue(model.wbs6_description)
  const wbs7Desc = getSingleFilterValue(model.wbs7_description)

  if ([wbs6Code, wbs7Code, wbs6Desc, wbs7Desc].some((val) => val === MULTI_VALUE)) {
    return null
  }

  const normalize = (val: SingleFilterValue) =>
    typeof val === 'string' ? val.trim() : null

  const code6 = normalize(wbs6Code)
  const code7 = normalize(wbs7Code)
  const desc6 = normalize(wbs6Desc)
  const desc7 = normalize(wbs7Desc)

  const index = wbsIndex.value
  const byId = index.byId

  const level6ByCode = code6 && byId.has(code6) ? [byId.get(code6)!] : null
  const level6ByName = desc6 ? (index.level6ByName.get(desc6) ?? []) : null

  let level6Candidates: WbsNode[] | null = null
  if (level6ByCode && level6ByName) {
    level6Candidates = level6ByName.filter((node) => node.id === code6)
  } else {
    level6Candidates = level6ByCode ?? level6ByName
  }

  const level7ByCode = code7 ? (index.level7ByCode.get(code7) ?? []) : null
  const level7ByName = desc7 ? (index.level7ByName.get(desc7) ?? []) : null

  let level7Candidates: WbsNode[] | null = null
  if (level7ByCode && level7ByName) {
    const names = new Set(level7ByName.map((node) => node.id))
    level7Candidates = level7ByCode.filter((node) => names.has(node.id))
  } else {
    level7Candidates = level7ByCode ?? level7ByName
  }

  if (level7Candidates && level7Candidates.length) {
    if (level6Candidates && level6Candidates.length) {
      const level6Ids = new Set(level6Candidates.map((node) => node.id))
      level7Candidates = level7Candidates.filter((node) => {
        const parentId = node.id.split('/')[0] ?? ''
        return level6Ids.has(parentId)
      })
    }
    return pickSingleNodeId(level7Candidates)
  }

  if (level6Candidates && level6Candidates.length) {
    return pickSingleNodeId(level6Candidates)
  }

  return null
}

const isSyncingFromGrid = ref(false)
const isSyncingFromTree = ref(false)

const applyWbsSelectionToGrid = (node: WbsNode | null) => {
  const api = gridApi.value
  if (!api || !api.getFilterModel || !api.setFilterModel) return

  const currentModel = (api.getFilterModel() ?? {}) as Record<string, FilterModelEntry>
  const currentId = resolveWbsIdFromFilters(currentModel)
  const targetId = node?.id ?? null
  if (currentId === targetId) return

  const nextModel: Record<string, FilterModelEntry> = { ...currentModel }
  delete nextModel.wbs6_code
  delete nextModel.wbs7_code
  delete nextModel.wbs6_description
  delete nextModel.wbs7_description

  if (node) {
    const parts = node.id.split('/')
    const wbs6Id = parts[0] ?? ''
    const wbs7Id = parts[1]
    const wbs6Node = wbsIndex.value.byId.get(wbs6Id)
    const wbs6Label = wbs6Node?.name || wbs6Id
    nextModel.wbs6_description = {
      filterType: 'text',
      type: 'equals',
      filter: encodeSetFilter([wbs6Label || '']),
    }
    if (wbs7Id) {
      const wbs7Node = wbsIndex.value.byId.get(`${wbs6Id}/${wbs7Id}`)
      const wbs7Label = wbs7Node?.name || wbs7Id
      nextModel.wbs7_description = {
        filterType: 'text',
        type: 'equals',
        filter: encodeSetFilter([wbs7Label || '']),
      }
    }
  }

  isSyncingFromTree.value = true
  api.setFilterModel(nextModel)
  api.onFilterChanged?.()
  setTimeout(() => {
    isSyncingFromTree.value = false
  }, 0)
}

const syncSelectedWbsFromGrid = () => {
  if (isSyncingFromTree.value) return
  const api = gridApi.value
  if (!api?.getFilterModel) return
  const model = (api.getFilterModel() ?? {}) as Record<string, FilterModelEntry>
  const targetId = resolveWbsIdFromFilters(model)
  const currentId = selectedWbsNode.value?.id ?? null
  if (targetId === currentId) return

  isSyncingFromGrid.value = true
  const node = targetId ? wbsIndex.value.byId.get(targetId) ?? null : null
  onWbsNodeSelected(node)
  setTimeout(() => {
    isSyncingFromGrid.value = false
  }, 0)
}

watch([selectedWbsNode, gridApi], ([node, api]) => {
  if (!api || isSyncingFromGrid.value) return
  applyWbsSelectionToGrid(node)
})

const gridRowData = computed<ApiPriceListItem[]>(() => rowData.value)
const { gridConfig: baseGridConfig } = usePriceListGridConfig(rowData)

const gridConfig = computed<DataGridConfig>(() => {
  const wbsOptions = wbsOptionsByField.value
  const projectColumn = {
    field: 'project_name',
    headerName: 'Progetto',
    width: 180,
    pinned: 'left' as const,
     
    valueGetter: (params: any) => {
      const data = params?.data
      if (!data) return ''
      if (data.project_code && data.project_name) {
        return `${data.project_code} • ${data.project_name}`
      }
      return data.project_name || data.project_code || '-'
    },
  }

  const columns = baseGridConfig.columns.map((col) => {
    let nextCol = col
    if (col.field === 'total_quantity' || col.field === 'total_amount') {
      nextCol = { ...col, hide: true }
    }

    const field = nextCol.field as keyof typeof wbsOptions | undefined
    if (field && field in wbsOptions) {
      nextCol = { ...nextCol, valuesGetter: () => wbsOptions[field] }
    }

    return nextCol
  })
  const codeIdx = columns.findIndex((col) => col.field === 'code')
  const insertIdx = codeIdx >= 0 ? codeIdx + 1 : 1
  columns.splice(insertIdx, 0, projectColumn)

  // Add row highlighting logic
  return {
    ...baseGridConfig,
    columns,
    rowClassRules: {
      ...(baseGridConfig.rowClassRules || {}),
      'ag-row-detail-active': (params: any) => {
        if (!detailItem.value) return false
        if (params.data.id && detailItem.value.id) {
          return params.data.id === detailItem.value.id
        }
        return false
      }
    }
  }
})



const itemCount = computed(() => {
  if (!isSemanticSearch.value) return serverTotal.value
  return selectedWbsNode.value ? filteredRowData.value.length : gridRowData.value.length
})

const projectCount = computed(() => {
  if (isSemanticSearch.value) {
    const projects = new Set(filteredRowData.value.map((i: any) => i.project_id).filter(Boolean));
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

const exportSelectedRows = () => {
  const rows = selectedRows.value
  if (!rows.length) return

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Listino')

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const filename = `listino-globale-selezionati_${timestamp}.xlsx`
  XLSX.writeFile(workbook, filename)
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
    scope: 'global',
    icon: 'i-heroicons-arrow-up-tray',
    keywords: ['export', 'excel', 'tabella'],
    handler: () => exportToXlsx('listino-globale'),
  })

  registerAction({
    id: 'grid.exportSelected',
    label: 'Esporta selezionati',
    description: 'Esporta le voci selezionate',
    category: 'Tabelle',
    scope: 'selection',
    icon: 'i-heroicons-arrow-up-tray',
    keywords: ['export', 'selezionati'],
    disabledReason: 'Seleziona almeno una voce',
    handler: () => exportSelectedRows(),
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
    onNodeSelected: (node: WbsNode | null) => onWbsNodeSelected(node),
  }
})

usePageSidebarModule({
  id: 'details',
  label: 'Dettaglio',
  icon: 'heroicons:document-text',
  order: 1,
  component: ItemDetailModule,
  props: {
    item: detailItem,
  },
})

usePageSidebarModule({
  id: 'actions',
  label: 'Azioni',
  icon: 'heroicons:command-line',
  order: 2,
  group: 'secondary',
  component: SidebarActionsModule,
  props: {
    actionIds: [
      'grid.exportExcel',
      'grid.exportSelected',
    ],
    selectionCount: selectedCount,
    showDisabled: true,
  },
})

const fetchCatalogRows = async (params: DataGridFetchParams) => {
  const sortModel = params.sortModel?.[0] as { colId?: string; sort?: 'asc' | 'desc' } | undefined

  const filters = params.filterModel && Object.keys(params.filterModel).length
    ? JSON.stringify(params.filterModel)
    : undefined

  const response = await $fetch<{ data: ApiPriceListItem[]; total: number }>('/api/catalog', {
    query: {
      page: params.page,
      pageSize: params.pageSize,
      search: params.quickFilter,
      sort: sortModel?.colId,
      order: sortModel?.sort,
      filters,
    },
  })

  const total = response.total ?? 0
  serverTotal.value = total
  return {
    data: response.data ?? [],
    total,
    page: params.page,
    pageSize: params.pageSize,
  }
}

const onGridReady = (params: { api: GridApi }) => {
  gridApi.value = params.api
  params.api.addEventListener('filterChanged', syncSelectedWbsFromGrid)
  syncSelectedWbsFromGrid()
}

const gridContext = computed(() => ({
  rowActions: {
    open: (row: any) => openDetail(row),
  },
}));
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
    selection-key="catalog"
    selection-mode="multiple"
    :context-extras="gridContext"
    @row-dblclick="openDetail"
    @grid-ready="onGridReady"
  >
    <!-- Meta Info: Counts -->
    <template #header-meta>
       <div class="flex items-center gap-2">
         <CountBadge :value="itemCount" label="Voci" icon="i-heroicons-server" />
         <CountBadge :value="projectCount" label="Progetti" icon="i-heroicons-folder" />
       </div>
    </template>


    <!-- Toolbar: Search & Grid Actions -->
    <template #pre-grid>
      <ClientOnly>
        <Teleport to="#topbar-actions-portal">
        <PageToolbar
          v-model="searchText"
          search-placeholder="Cerca voce..."
          clear-label="Reset filtri catalogo"
          class="!py-0"
          @clear="handleReset"
        />
        </Teleport>
      </ClientOnly>
    </template>
  </DataGridPage>
</template>
