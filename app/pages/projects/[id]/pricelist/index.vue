
<script setup lang="ts">
/**
 * Project Pricelist Page (Listino di Progetto)
 * 
 * formally identical to Estimate page but adapted for Price Catalog.
 * Shows WBS 06 and 07 only.
 */

import { useRoute, useRouter } from 'vue-router'
import { usePriceListGridConfig } from '~/composables/estimates/usePriceListGridConfig'
import type { ApiOfferSummary, ApiPriceListItem } from '~/types/api'
import type { Project } from '#types'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { GridApi } from 'ag-grid-community'
import { useCurrentContext } from '~/composables/useCurrentContext'
import { useWbsTree, type WithWbsHierarchy } from '~/composables/useWbsTree'
import { useSidebarModules, usePageSidebarModule } from '~/composables/useSidebarModules'
import WbsModule from '~/components/sidebar/modules/WbsModule.vue'
import SidebarActionsModule from '~/components/sidebar/modules/SidebarActionsModule.vue'
import ItemDetailModule from '~/components/sidebar/modules/ItemDetailModule.vue'
import DataGridPage from '~/components/layout/DataGridPage.vue'
import PageToolbar from '~/components/layout/PageToolbar.vue'
import PriceSummaryDisplay from '~/components/common/PriceSummaryDisplay.vue'
import { formatDelta, formatDeltaCurrency } from '~/lib/formatters'
import { useActionsStore } from '~/stores/actions'
import type { Action } from '~/types/actions'
import type { WbsNode } from '~/types/wbs'

// ---------------------------------------------------------------------------
// Layout & Page Meta
// ---------------------------------------------------------------------------
definePageMeta({
  // Assets managed by layout centrally
})

const route = useRoute()
const router = useRouter()
const projectId = route.params.id as string

// Validate ID immediately
if (projectId === '[object Object]' || projectId === 'undefined' || projectId === 'null') {
  console.error('[Pricelist] Invalid project ID in route, redirecting to list:', projectId)
  if (import.meta.client) {
     // use router.replace to avoid history stack issues
     router.replace('/projects')
  }
}

const rawEstimateId = computed(() => {
  const value = route.query.estimateId
  return typeof value === 'string' && value !== 'null' && value !== 'undefined' ? value : null
})
const selectedEstimateId = ref<string | null>(rawEstimateId.value)
const { setCurrentEstimate } = useCurrentContext()
const actionsStore = useActionsStore()
const actionOwner = 'page:pricelist-index'


// ---------------------------------------------------------------------------
// Project Context
// ---------------------------------------------------------------------------
const { data: projectContext, status: contextStatus } = await useFetch<Project>(
  `/api/projects/${projectId}/context`,
)

const estimates = computed(() => projectContext.value?.estimates ?? [])
const selectedEstimate = computed(() =>
  estimates.value.find((est) => est.id === activeEstimateId.value) ?? null,
)
const selectedEstimateName = computed(() => selectedEstimate.value?.name || null)

watch(
  rawEstimateId,
  (value) => {
    selectedEstimateId.value = value
  },
  { immediate: true },
)

watch(
  estimates,
  (list) => {
    if (!list.length) {
      selectedEstimateId.value = null
      return
    }

    const fallbackId = list[0]?.id
    const exists = list.some((est) => est.id === selectedEstimateId.value)

    if (!selectedEstimateId.value || !exists) {
      selectedEstimateId.value = fallbackId ?? null
      if (selectedEstimateId.value && import.meta.client) {
        router.replace({ query: { ...route.query, estimateId: selectedEstimateId.value } })
      }
    }
  },
  { immediate: true },
)

const activeEstimateId = computed(() => selectedEstimateId.value ?? undefined)

watch(
  activeEstimateId,
  (val) => {
    if (val) {
      setCurrentEstimate(val).catch((err) => console.error('Failed to set current estimate', err))
    }
  },
  { immediate: true },
)

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------
const offerRound = computed(() => route.query.round ? Number(route.query.round) : undefined)
const offerCompany = computed(() => route.query.company as string | undefined)

const { data: estimateOffers } = await useFetch<{ offers: ApiOfferSummary[] }>(`/api/projects/${projectId}/offers`, {
  query: computed(() => ({ estimate_id: activeEstimateId.value })),
  immediate: !!activeEstimateId.value,
  watch: [activeEstimateId],
})

const resolvedOfferId = computed(() => {
  if (route.query.offerId && route.query.offerId !== 'null') {
    return route.query.offerId as string
  }

  const r = offerRound.value
  const c = offerCompany.value
  const offersList = estimateOffers.value?.offers || []
  
  if (r !== undefined && c && offersList.length) {
    const found = offersList.find((o) => {
      // Check round - loose comparison for safety
      if (o.round_number != r) return false
      
      // Check company - try name, ID, or company_id
      const cStr = String(c).toLowerCase()
      if (o.company_name?.toLowerCase() === cStr) return true
      if (o.id === c) return true
      if ((o as any).company_id === c) return true
      if ((o as any).company === c) return true
      return false
    })
    return found?.id || (found as { _id?: string })?._id
  }
  return null
})

const deltaPerc = computed(() => {
  // 1. Try internal calculation first
  if (resolvedOfferId.value && estimateOffers.value?.offers) {
    const current = estimateOffers.value.offers.find(o => o.id === resolvedOfferId.value || (o as any)._id === resolvedOfferId.value)
    
    // Find baseline: explicit baseline offer OR the estimate itself
    let baselineAmount = 0
    const baselineOffer = estimateOffers.value.offers.find(o => o.is_baseline)
    
    if (baselineOffer) {
      baselineAmount = baselineOffer.total_amount ?? 0
    } else if (selectedEstimate.value && (selectedEstimate.value as any).total_amount) {
       // Fallback to estimate total
       baselineAmount = (selectedEstimate.value as any).total_amount ?? 0
    }
    
    if (current && baselineAmount > 0) {
      if (current.id === baselineOffer?.id) return 0
      const diff = (current.total_amount || 0) - baselineAmount
      return diff / baselineAmount
    }
  }

  // 2. Fallback to query params
  const value = route.query.deltaPerc
  if (typeof value !== 'string' || value === 'null' || value === 'undefined') return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
})

const deltaAmount = computed(() => {
  // 1. Try internal calculation first
  if (resolvedOfferId.value && estimateOffers.value?.offers) {
    const current = estimateOffers.value.offers.find(o => o.id === resolvedOfferId.value || (o as any)._id === resolvedOfferId.value)
    
    let baselineAmount = 0
    const baselineOffer = estimateOffers.value.offers.find(o => o.is_baseline)
    
    if (baselineOffer) {
      baselineAmount = baselineOffer.total_amount ?? 0
    } else if (selectedEstimate.value && (selectedEstimate.value as any).total_amount) {
       baselineAmount = (selectedEstimate.value as any).total_amount ?? 0
    }
    
    if (current && baselineAmount > 0) {
      if (current.id === baselineOffer?.id) return 0
      return (current.total_amount || 0) - baselineAmount
    }
  }

  // 2. Fallback to query params
  const value = route.query.deltaAmount
  if (typeof value !== 'string' || value === 'null' || value === 'undefined') return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
})

const deltaLabel = computed(() => {
  if (deltaPerc.value !== null) return formatDelta(deltaPerc.value)
  if (deltaAmount.value !== null) return formatDeltaCurrency(deltaAmount.value)
  return null
})

const deltaTone = computed<'neutral' | 'success' | 'warning'>(() => {
  const value = deltaPerc.value ?? deltaAmount.value
  if (value === null) return 'neutral'
  // Fix for "neutral" strictly on 0, but usually tiny float diffs might exist. 
  // Should match comparison logic: < 0 is success (cheaper), > 0 is warning (more expensive).
  if (Math.abs(value) < 0.000001) return 'neutral'
  return value < 0 ? 'success' : 'warning'
})

const priceListUrl = computed(() => {
  if (resolvedOfferId.value) {
    return `/api/projects/${projectId}/offers/${resolvedOfferId.value}/items`
  }

  if (activeEstimateId.value) {
    return `/api/projects/${projectId}/estimates/${activeEstimateId.value}/items`
  }

  return ''
})

const {
  data: priceCatalog,
  status: catalogStatus,
  execute: fetchPriceList,
} = await useFetch<{ items: ApiPriceListItem[] }>(priceListUrl, { 
    immediate: false,
    watch: [priceListUrl] 
})

watch(
  priceListUrl,
  (url) => {
    if (url) {
      fetchPriceList()
    }
  },
  { immediate: true },
)

const loading = computed(
  () => contextStatus.value === 'pending' || catalogStatus.value === 'pending',
)
type PriceListWbsItem = ApiPriceListItem & WithWbsHierarchy

const rowData = computed<PriceListWbsItem[]>(() => priceCatalog.value?.items || [])

// ---------------------------------------------------------------------------
// Pending Offer Items Resolution
// ---------------------------------------------------------------------------
interface PendingCandidate {
  id: string
  code?: string
  description?: string
  unit?: string
}

interface PendingOfferItem {
  id: string
  description?: string
  code?: string
  quantity: number
  unit_price: number
  candidates: PendingCandidate[]
}

const pendingUrl = computed(() => {
  if (!activeEstimateId.value) return ''
  const base = `/api/projects/${projectId}/offers/pending`
  const query = new URLSearchParams()
  query.set('estimate_id', activeEstimateId.value)
  if (route.query.round) query.set('round', route.query.round as string)
  if (route.query.company) query.set('company', route.query.company as string)
  return `${base}?${query.toString()}`
})

const {
  data: pendingData,
  execute: fetchPending,
} = await useFetch<{ items: PendingOfferItem[] }>(pendingUrl, {
  immediate: false,
  watch: [pendingUrl],
})

watch(
  pendingUrl,
  (url) => {
    if (url) fetchPending()
  },
  { immediate: true },
)

const pendingItems = computed(() => pendingData.value?.items || [])

// ---------------------------------------------------------------------------
// WBS and Grid
// ---------------------------------------------------------------------------
const {
  wbsNodes,
  selectedWbsNode,
  filteredRowData,
  onWbsNodeSelected,
} = useWbsTree<PriceListWbsItem>(rowData, {
  getLevels: (item: PriceListWbsItem) => {
    const levels: { code: string; name?: string; level?: number }[] = []
    if (item.wbs6_code && item.wbs6_description) {
      levels.push({ code: item.wbs6_code, name: item.wbs6_description, level: 6 })
    }
    if (item.wbs7_code && item.wbs7_description) {
      levels.push({ code: item.wbs7_code, name: item.wbs7_description, level: 7 })
    }
    return levels
  }
})

watch(activeEstimateId, (val) => {
  // Reset WBS filter on estimate change to prevent "Total Zero" due to stale node ID
  onWbsNodeSelected(null)
})

// Grid Stats
const currentTotalAmount = ref(0)
const grandTotalAmount = computed(() =>
  rowData.value.reduce((sum, item) => sum + Number(item.total_amount ?? 0), 0),
)

// Toolbar State
const searchText = ref('')
const gridApi = ref<GridApi | null>(null)
const { exportToXlsx } = useDataGridExport(gridApi)

const updateGridStats = () => {
  if (!gridApi.value) return
  let sum = 0
  gridApi.value.forEachNodeAfterFilter((node: any) => {
    if (node.data) sum += Number(node.data.total_amount ?? 0)
  })
  currentTotalAmount.value = sum
}

// Watch row data changes to update stats initially (before grid interaction)
watch(filteredRowData, () => {
  // If grid is not ready yet, we can't iterate nodes, but we can fallback to simple reduce
  if (!gridApi.value) {
     currentTotalAmount.value = filteredRowData.value.reduce((sum, item) => sum + Number(item.total_amount ?? 0), 0)
  } else {
     // If grid is ready, wait for model update or force recalc
     requestAnimationFrame(updateGridStats)
  }
}, { immediate: true })

const { gridConfig } = usePriceListGridConfig(rowData)

// Extend grid config to add row highlighting logic
const extendedGridConfig = computed(() => {
  const base = gridConfig
  return {
    ...base,
    rowClassRules: {
      ...(base.rowClassRules || {}),
      'ag-row-detail-active': (params: any) => {
        if (!selectedItem.value) return false
        // Match by ID if available, otherwise by code comparison or direct object reference check
        if (params.data.id && selectedItem.value.id) {
          return params.data.id === selectedItem.value.id
        }
        return false
      }
    }
  }
})

const pageTitle = computed(() => 'Listino')
const pageSubtitle = computed(() => 
  selectedEstimateName.value || (activeEstimateId.value ? 'Listino Preventivo' : 'Listino di Progetto')
)

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
      filter: encodeSetFilter([wbs6Label ?? wbs6Id]),
    }
    if (wbs7Id) {
      const wbs7Node = wbsIndex.value.byId.get(`${wbs6Id}/${wbs7Id}`)
      const wbs7Label = wbs7Node?.name || wbs7Id
      nextModel.wbs7_description = {
        filterType: 'text',
        type: 'equals',
        filter: encodeSetFilter([wbs7Label ?? wbs7Id]),
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

const onGridReady = (params: any) => {
  gridApi.value = params.api
  params.api.addEventListener('modelUpdated', updateGridStats)
  params.api.addEventListener('filterChanged', () => {
    updateGridStats()
    syncSelectedWbsFromGrid()
  })
  syncSelectedWbsFromGrid()
}

const handleReset = () => {
  searchText.value = ''
  onWbsNodeSelected(null)
  gridApi.value?.setFilterModel(null)
  gridApi.value?.setGridOption('quickFilterText', '')
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
    icon: 'i-heroicons-arrow-up-tray',
    keywords: ['export', 'excel', 'tabella'],
    handler: () => exportToXlsx('listino-items'),
  })

  registerAction({
    id: 'grid.resetFilters',
    label: 'Reset filtri tabella',
    description: 'Cancella filtri e ricerca della tabella',
    category: 'Tabelle',
    scope: 'selection',
    icon: 'i-heroicons-arrow-path',
    keywords: ['reset', 'filtri', 'search'],
    handler: () => handleReset(),
  })

})


onUnmounted(() => {
  actionsStore.unregisterOwner(actionOwner)
})

const { isVisible: sidebarVisible, setActiveModule, showSidebar, hideSidebar } = useSidebarModules()
// const { showDefaultSidebar } = useSidebarLayout() // unused

const selectedItem = ref<any>(null)

const openDetail = (row: any) => {
  if (!row) return
  
  // Toggle logic: if clicking the same row that is already detail-active, close it
  const isCurrentlyOpen = selectedItem.value && selectedItem.value.id === row.id && 
                          sidebarVisible.value && useSidebarModules().activeModuleId.value === 'detail'
  
  if (isCurrentlyOpen) {
    hideSidebar()
    selectedItem.value = null
    return
  }

  selectedItem.value = row
  if (sidebarVisible.value && useSidebarModules().activeModuleId.value === 'detail') {
    // Already open
  } else {
    setActiveModule('detail')
    showSidebar()
  }
}

// Register WBS Module using route-scoped helper
usePageSidebarModule({
  id: 'wbs',
  label: 'WBS',
  icon: 'heroicons:squares-2x2',
  order: 1, // Secondary module - won't auto-activate, Assets stays active
  component: WbsModule,
  props: {
    nodes: wbsNodes,
    selectedNodeId: computed(() => selectedWbsNode.value?.id ?? null),
    onNodeSelected: (node: typeof selectedWbsNode.value | null) => onWbsNodeSelected(node),
  },
})

usePageSidebarModule({
  id: 'actions',
  label: 'Azioni',
  icon: 'heroicons:command-line',
  order: 2,
  group: 'secondary',
  autoActivate: true,
  component: SidebarActionsModule,
  props: {
    actionIds: [
      'grid.exportExcel',
      'grid.resetFilters',
    ],
  },
})

// Register Detail Module
usePageSidebarModule({
  id: 'detail',
  label: 'Dettaglio',
  icon: 'heroicons:document-text',
  order: 3,
  component: ItemDetailModule,
  props: {
    item: selectedItem,
  },
})

const gridContext = computed(() => ({
  rowActions: {
    open: (row: any) => openDetail(row),
  },
}));

// Force redraw rows when selected item changes to apply highlighting
watch(selectedItem, () => {
    if (gridApi.value) {
        gridApi.value.redrawRows()
    }
})

</script>

<template>
  <DataGridPage
    :title="pageTitle"
    :grid-config="extendedGridConfig"
    :row-data="rowData as any"
    :loading="loading"
    empty-state-title="Nessuna voce trovata"
    empty-state-message="Il listino non contiene ancora voci."
    
    :show-toolbar="false"
    :filter-text="searchText"
    :context-extras="gridContext"
    @row-dblclick="(row: any) => openDetail(row)"
    @grid-ready="onGridReady"
  >
    <!-- Header Meta: Context + Stats -->
    <template #header-meta>
       <div class="flex items-center gap-2">
         <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
            {{ pageSubtitle }}
         </span>
       </div>
    </template>

    <template #actions>
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
          <Icon name="heroicons:list-bullet" class="w-3.5 h-3.5" />
          {{ filteredRowData.length }} voci
        </span>
        <span
          v-if="deltaLabel"
          :class="[
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold',
            deltaTone === 'success'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : deltaTone === 'warning'
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
          ]"
        >
          <Icon
            v-if="deltaTone !== 'neutral'"
            :name="deltaTone === 'warning' ? 'heroicons:arrow-trending-up' : 'heroicons:arrow-trending-down'"
            class="w-3.5 h-3.5"
          />
          Delta {{ deltaLabel }}
        </span>
        <PriceSummaryDisplay :current="currentTotalAmount" :total="grandTotalAmount" />
      </div>
    </template>

    <!-- Toolbar Slot -->
    <template #pre-grid>
        <!-- Pending Items Section (Pre-Grid Content) -->
        <div
            v-if="!activeEstimateId && !loading"
            class="py-4 px-4 mb-4 text-center text-sm text-[hsl(var(--muted-foreground))]"
        >
          Seleziona un preventivo per visualizzare il listino.
        </div>

        <div
          v-if="activeEstimateId && pendingItems.length"
          class="mb-6"
        >
          <UAlert
            color="warning"
            variant="soft"
            title="Voci da risolvere"
            :description="`Ci sono ${pendingItems.length} voci con codice ambiguo o mancante.`"
            icon="i-heroicons-exclamation-triangle"
          >
            <template #actions>
              <UButton
                size="xs"
                color="warning"
                variant="solid"
                label="Vai al Centro Conflitti"
                :to="`/projects/${projectId}/conflicts?estimateId=${activeEstimateId}&status=open`"
              />
            </template>
          </UAlert>
        </div>

        <!-- The Toolbar (Teleported to Header) -->
        <ClientOnly>
          <Teleport to="#topbar-actions-portal">
        <PageToolbar
          v-model="searchText"
          search-placeholder="Cerca voce..."
          class="!py-0"
        />
          </Teleport>
        </ClientOnly>
    </template>

  </DataGridPage>
</template>
