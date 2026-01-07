<script setup lang="ts">
import { computed, ref, watch, defineAsyncComponent, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { GridApi, GridReadyEvent, RowNode } from 'ag-grid-community'
import { useCurrentContext } from '~/composables/useCurrentContext'
import { useColorMode } from '#imports'
import DataGridPage from '~/components/layout/DataGridPage.vue'
import PageToolbar from '~/components/layout/PageToolbar.vue'
// PriceSummaryDisplay removed as requested
import { useWbsTree } from '~/composables/useWbsTree'
import { useSidebarModules, usePageSidebarModule } from '~/composables/useSidebarModules'
import { useProjectTree } from '~/composables/useProjectTree'
import WbsModule from '~/components/sidebar/modules/WbsModule.vue'
import SidebarActionsModule from '~/components/sidebar/modules/SidebarActionsModule.vue'
import ItemDetailModule from '~/components/sidebar/modules/ItemDetailModule.vue'
import { formatCurrency, formatNumber } from '~/lib/formatters'
import type { Project } from '#types'
import { useActionsStore } from '~/stores/actions'
import type { Action } from '~/types/actions'
import type { WbsNode } from '~/types/wbs'

// Lazy load heavy ImportWizard component (31KB)
const ImportWizard = defineAsyncComponent(() => import('~/components/projects/ImportWizard.vue'))

definePageMeta({
  // Layout handles Assets module centrally
})

const route = useRoute()
const router = useRouter()
const projectId = route.params.id as string
const estimateId = route.params.estimateId as string
const _colorMode = useColorMode()
const { setCurrentEstimate } = useCurrentContext()
const actionsStore = useActionsStore()
const actionOwner = 'page:estimate-comparison'

await setCurrentEstimate(estimateId).catch((err) => console.error('Failed to set current estimate', err))

// ─────────────────────────────────────────────────────────────────────────────
// FILTERS
// ─────────────────────────────────────────────────────────────────────────────
const selectedRound = ref<string | null>((route.query.round as string) || null)
const selectedCompany = ref<string | null>((route.query.company as string) || null)

// Update URL when filters change
watch([selectedRound, selectedCompany], () => {
  const q: Record<string, string> = {}
  if (selectedRound.value) q.round = selectedRound.value
  if (selectedCompany.value) q.company = selectedCompany.value
  router.replace({ query: q })
})

// ─────────────────────────────────────────────────────────────────────────────
// DATA FETCHING
// ─────────────────────────────────────────────────────────────────────────────
const apiUrl = computed(() => {
  const params = new URLSearchParams()
  if (selectedRound.value) params.set('round', selectedRound.value)
  if (selectedCompany.value) params.set('company', selectedCompany.value)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return `/api/projects/${projectId}/estimate/${estimateId}/comparison${suffix}`
})

type OfferEntry = {
  codice?: string | null;
  descrizione?: string | null;
  wbs6_code?: string | null;
  wbs6_description?: string | null;
  wbs7_code?: string | null;
  wbs7_description?: string | null;
  prezzo_progetto?: number | null;
  quantita_progetto?: number | null;
  importo_progetto?: number | null;
  importo_totale_progetto?: number | null;
  media_prezzi?: number | null;
  minimo_prezzi?: number | null;
  massimo_prezzi?: number | null;
  offerte: Record<string, {
    codice?: string | null;
    descrizione?: string | null;
    quantita?: number | null;
    prezzo_unitario?: number | null;
    importo_totale?: number | null;
    delta_media?: number | null;
    delta_quantita?: number | null;
    delta_prezzo_media?: number | null;
    delta_importo_progetto?: number | null; // Helper for consistency
  }>;
};

interface ComparisonResponse {
  voci: OfferEntry[]
  imprese: { nome: string; round_number?: number; round_label?: string }[]
  rounds: { numero: number; label: string }[]
  all_rounds: { numero: number; label: string }[]
  all_imprese: { nome: string }[]
}

const { data: comparison, status, refresh } = await useFetch<ComparisonResponse>(apiUrl, {
  watch: [apiUrl],
  immediate: true,
})

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT CONTEXT (for Assets sidebar)
// ─────────────────────────────────────────────────────────────────────────────
const { data: context, status: contextStatus } = await useFetch<Project>(
  `/api/projects/${projectId}/context`,
  { 
    key: `project-context-${projectId}-comparison`,
    immediate: !!projectId
  },
)

const currentEstimateData = computed(() => {
  if (!context.value?.estimates) return undefined
  return context.value.estimates.find(e => e.id === estimateId)
})

const { treeNodes } = useProjectTree(context, currentEstimateData)

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTED DATA & WBS
// ─────────────────────────────────────────────────────────────────────────────
const isLoading = computed(() => status.value === 'pending')
const rows = computed(() => comparison.value?.voci || [])

const roundOptions = computed(() => {
  if (comparison.value?.all_rounds?.length) {
    return comparison.value.all_rounds.map(r => ({ numero: r.numero, label: `Round ${r.numero}` }))
  }
  return []
})

const companyOptions = computed(() => {
  if (comparison.value?.all_imprese?.length) {
    return comparison.value.all_imprese.map(c => ({ nome: c.nome }))
  }
  return []
})

// useWbsTree logic
const { wbsNodes, selectedWbsNode, onWbsNodeSelected } = useWbsTree(rows as any, {
  getLevels: (item: any) => {
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

// ─────────────────────────────────────────────────────────────────────────────
// WBS FILTER SYNC LOGIC (Ported from pricelist)
// ─────────────────────────────────────────────────────────────────────────────
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
    if (setValues.length === 1) return setValues[0]
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
  nodes && nodes.length === 1 ? nodes[0].id : null

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
        const parentId = node.id.split('/')[0]
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
    const wbs6Id = parts[0]
    const wbs7Id = parts[1]
    const wbs6Node = wbsIndex.value.byId.get(wbs6Id)
    const wbs6Label = wbs6Node?.name || wbs6Id
    nextModel.wbs6_description = {
      filterType: 'text',
      type: 'equals',
      filter: encodeSetFilter([wbs6Label]),
    }
    if (wbs7Id) {
      const wbs7Node = wbsIndex.value.byId.get(`${wbs6Id}/${wbs7Id}`)
      const wbs7Label = wbs7Node?.name || wbs7Id
      nextModel.wbs7_description = {
        filterType: 'text',
        type: 'equals',
        filter: encodeSetFilter([wbs7Label]),
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

// ─────────────────────────────────────────────────────────────────────────────
// GRID STATE & UTILS
// ─────────────────────────────────────────────────────────────────────────────
const gridApi = ref<GridApi | null>(null)
const pinnedBottomRows = ref<any[]>([])

const calculateTotals = () => {
  if (!gridApi.value) return
  
  let projSum = 0
  let minSum = 0
  let maxSum = 0
  let avgSum = 0
  const offerSums: Record<string, { quantity: number, amount: number, delta: number }> = {}

  // Initialize offer sums
  companyOptions.value.forEach(c => {
    offerSums[c.nome] = { quantity: 0, amount: 0, delta: 0 }
  })

  // Iterate filtered rows
  gridApi.value.forEachNodeAfterFilter((node: any) => {
    if (!node.data) return
    const data = node.data as OfferEntry

    // Calcolo robusto importo progetto
    let pAmt = Number(data.importo_totale_progetto);
    if (isNaN(pAmt) || pAmt === 0) {
        // Fallback: price * quantity
        const price = Number((data as any).prezzo_unitario_progetto) || Number(data.prezzo_progetto) || 0;
        const qty = Number(data.quantita_progetto) || Number((data as any).quantita) || 0;
        pAmt = price * qty;
    }
    projSum += (pAmt || 0);

    // Stats sums (Price * Qty)
    const rowQty = Number(data.quantita_progetto) || Number((data as any).quantita) || 0;
    
    if (data.minimo_prezzi) minSum += (data.minimo_prezzi * rowQty);
    if (data.massimo_prezzi) maxSum += (data.massimo_prezzi * rowQty);
    if (data.media_prezzi) avgSum += (data.media_prezzi * rowQty);
    
    // Sum offers
    if (data.offerte) {
       for (const [key, offer] of Object.entries(data.offerte)) {
          if (!offerSums[key]) continue // skip if not in visible?
          const oAmt = Number(offer.importo_totale) || 0;
          offerSums[key].amount += oAmt
       }
    }
  })

  // Build Pinned Row

  const finalizedOffers: Record<string, any> = {}
  for (const [key, val] of Object.entries(offerSums)) {
      finalizedOffers[key] = {
          importo_totale: val.amount,
          delta_importo_progetto: val.amount - projSum
      }
  }

  pinnedBottomRows.value = [{
    codice: 'TOTALE',
    descrizione: '',
    importo_totale_progetto: projSum,
    minimo_prezzi: minSum,
    massimo_prezzi: maxSum,
    media_prezzi: avgSum,
    offerte: finalizedOffers
  }]
}

watch([selectedWbsNode, gridApi], ([node, api]) => {
  if (!api || isSyncingFromGrid.value) return
  applyWbsSelectionToGrid(node)
})

const onGridReady = (params: GridReadyEvent<Record<string, unknown>>) => {
  gridApi.value = params.api
  params.api.addEventListener('modelUpdated', () => {
     calculateTotals()
  })
  params.api.addEventListener('filterChanged', () => {
    syncSelectedWbsFromGrid()
    calculateTotals()
  })
  
  // Initial sync
  if (selectedWbsNode.value) {
    applyWbsSelectionToGrid(selectedWbsNode.value)
  }
  
  // Force initial total calculation
  calculateTotals()
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR MODULES
// ─────────────────────────────────────────────────────────────────────────────
const { isVisible: sidebarVisible, setActiveModule, showSidebar } = useSidebarModules()

usePageSidebarModule({
  id: 'wbs',
  label: 'WBS',
  icon: 'heroicons:squares-2x2',
  order: 1,
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
      'estimate.importOffers',
      'grid.exportExcel',
      'comparison.resetFilters',
      'comparison.refresh',
    ],
    primaryActionIds: ['estimate.importOffers'],
  },
})

// Detail Module
const selectedItem = ref<any>(null)
const openDetail = (row: any) => {
  if (!row) return

  // Toggle logic: if clicking the same row that is already detail-active, close it (but keep sidebar open if needed, user said "lasciando però aperta la sidebar")
  // Actually, user said "annullare il dettaglio" (cancel detail) -> meaning remove highlight/selection
  const isCurrentlyOpen = selectedItem.value && (selectedItem.value === row || selectedItem.value.codice === row.codice) && 
                          sidebarVisible.value && useSidebarModules().activeModuleId.value === 'detail'
  
  if (isCurrentlyOpen) {
    selectedItem.value = null
    // sidebar remains open as per user request, but showing empty state
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
usePageSidebarModule({
  id: 'detail',
  label: 'Dettaglio',
  icon: 'heroicons:document-text',
  order: 3,
  component: ItemDetailModule,
  props: { item: selectedItem },
})

watch(selectedItem, () => {
  gridApi.value?.redrawRows()
})

const gridContext = computed(() => ({
  rowActions: {
    viewDetail: (row: any) => openDetail(row),
  }
}))

// Actions registration
onMounted(() => {
  actionsStore.registerAction({
    id: 'estimate.importOffers',
    label: 'Importa offerte',
    description: 'Apri la procedura di import offerte',
    category: 'Preventivi',
    scope: 'estimate',
    icon: 'i-heroicons-arrow-down-tray',
    handler: () => { isImportModalOpen.value = true }
  })
  actionsStore.registerAction({
    id: 'grid.exportExcel',
    label: 'Esporta in Excel',
    description: 'Esporta dati in Excel',
    category: 'Tabelle',
    scope: 'selection',
    icon: 'i-heroicons-arrow-up-tray',
    handler: () => exportToXlsx('confronto-offerte')
  })
  actionsStore.registerAction({
    id: 'comparison.resetFilters',
    label: 'Reset filtri confronto',
    description: 'Pulisce round, impresa e filtro WBS',
    category: 'Preventivi',
    scope: 'estimate',
    icon: 'i-heroicons-arrow-path',
    handler: () => {
      selectedRound.value = null
      selectedCompany.value = null
      selectedWbsNode.value = null
    }
  })
  actionsStore.registerAction({
    id: 'comparison.refresh',
    label: 'Aggiorna confronto',
    description: 'Ricarica i dati di confronto',
    category: 'Preventivi',
    scope: 'estimate',
    icon: 'i-heroicons-arrow-path',
    handler: () => refresh()
  })
})

onUnmounted(() => {
  actionsStore.unregisterOwner(actionOwner)
})

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const { exportToXlsx } = useDataGridExport(gridApi)

const fmtNumber = (v: number | string | null | undefined) =>
  formatNumber(Number(v) || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2, fallback: '0' })
const fmtCurrency = (v: number | string | null | undefined) =>
  formatCurrency(Number(v) || 0)

const getCompanyColor = (index: number) => {
  const colors = [
    { bg: 'rgba(59, 130, 246, 0.06)', border: 'rgba(59, 130, 246, 0.15)' }, 
    { bg: 'rgba(249, 115, 22, 0.06)', border: 'rgba(249, 115, 22, 0.15)' },
    { bg: 'rgba(139, 92, 246, 0.06)', border: 'rgba(139, 92, 246, 0.15)' },
    { bg: 'rgba(236, 72, 153, 0.06)', border: 'rgba(236, 72, 153, 0.15)' },
    { bg: 'rgba(34, 197, 94, 0.06)', border: 'rgba(34, 197, 94, 0.15)' },
  ]
  return colors[index % colors.length]
}

const getDeltaStyle = (value: number | null | undefined) => {
  if (value == null || Math.abs(value) < 0.01) return {}
  return {
    color: value > 0 ? '#ef4444' : '#22c55e',
    fontWeight: '600',
  }
}

const baseColumns = [
  // Hidden WBS Columns for Filtering
  { field: 'wbs6_code', hide: true, headerName: 'WBS 6 Code' },
  { field: 'wbs6_description', hide: true, headerName: 'WBS 6 Desc' },
  { field: 'wbs7_code', hide: true, headerName: 'WBS 7 Code' },
  { field: 'wbs7_description', hide: true, headerName: 'WBS 7 Desc' },

  {
    headerName: 'VOCE',
    headerClass: 'ag-header-group-cell-label',
    children: [
      { field: 'codice', headerName: 'Codice', width: 130, pinned: 'left' as const },
      { field: 'descrizione', headerName: 'Descrizione', width: 280, pinned: 'left' as const },
    ]
  },
  {
    headerName: 'DATI PROGETTO',
    headerClass: 'ag-header-group-cell-label',
    children: [
      { field: 'um', headerName: 'UM', width: 70 },
      {
        field: 'quantita',
        headerName: 'Q.tà',
        width: 100,
        type: 'numericColumn',
        valueFormatter: ({ value }: { value: number | null }) => fmtNumber(value),
      },
      {
        field: 'prezzo_unitario_progetto',
        headerName: 'P.U.',
        width: 110,
        type: 'numericColumn',
        valueFormatter: ({ value }: { value: number | null }) => fmtCurrency(value),
      },
      {
        field: 'importo_totale_progetto',
        headerName: 'Importo',
        width: 130,
        type: 'numericColumn',
        valueFormatter: ({ value }: { value: number | null }) => fmtCurrency(value),
        cellStyle: (params: any) => {
            if (params.node && params.node.rowPinned) return { 
              fontWeight: '800', 
              fontSize: '14px',
              color: 'hsl(var(--primary))' 
            }
            return { fontWeight: '600' }
        },
      },
    ]
  },
  {
    headerName: 'STATISTICHE',
    headerClass: 'ag-header-group-cell-label',
    children: [
      {
        field: 'media_prezzi',
        headerName: 'Media',
        width: 110,
        type: 'numericColumn',
        valueFormatter: ({ value }: { value: number | null }) => (value != null ? fmtCurrency(value) : '-'),
        cellStyle: (params: any) => {
          if (params.node.rowPinned) return { fontWeight: '800', fontSize: '14px' }
          return { fontStyle: 'italic', backgroundColor: 'rgba(0,0,0,0.02)' }
        },
      },
      {
        field: 'minimo_prezzi',
        headerName: 'Min',
        width: 100,
        type: 'numericColumn',
        valueFormatter: ({ value }: { value: number | null }) => (value != null ? fmtCurrency(value) : '-'),
        cellStyle: (params: any) => {
          if (params.node.rowPinned) return { fontWeight: '800', fontSize: '14px', color: '#22c55e' }
          return { color: '#22c55e', fontWeight: '500' }
        },
      },
      {
        field: 'massimo_prezzi',
        headerName: 'Max',
        width: 100,
        type: 'numericColumn',
        valueFormatter: ({ value }: { value: number | null }) => (value != null ? fmtCurrency(value) : '-'),
        cellStyle: (params: any) => {
           if (params.node.rowPinned) return { fontWeight: '800', fontSize: '14px', color: '#ef4444' }
           return { color: '#ef4444', fontWeight: '500' }
        },
      },
    ]
  }
]

const companyColumns = computed(() => {
  const visibleCompanies = comparison.value?.imprese || []
  return visibleCompanies.map((company, idx) => {
    const key = company.nome
    const color = getCompanyColor(idx)

    return {
      headerName: company.round_label ? `${key} (${company.round_label})` : key,
      headerClass: 'ag-header-group-cell-label',
      groupId: `group_${key}`,
      children: [
        {
          field: `offerte.${key}.quantita`,
          headerName: 'Q.tà',
          width: 90,
          type: 'numericColumn',
          filter: 'number',
          valueFormatter: ({ value }: { value: number | null }) => (value != null ? fmtNumber(value) : '-'),
          cellStyle: { backgroundColor: color?.bg },
        },
        {
          field: `offerte.${key}.delta_quantita`,
          headerName: 'Δ Q.tà',
          width: 90,
          type: 'numericColumn',
          filter: 'number',
          valueFormatter: ({ value }: { value: number | null }) =>
            value != null && Math.abs(value) >= 0.01 ? `${value > 0 ? '+' : ''}${fmtNumber(value)}` : '-',
          cellStyle: (params: any) => {
            if (params.node && params.node.rowPinned) return { backgroundColor: color?.bg }
            return {
              backgroundColor: color?.bg,
              ...getDeltaStyle(params.value ?? 0),
            }
          },
        },
        {
          field: `offerte.${key}.prezzo_unitario`,
          headerName: 'Prezzo',
          width: 110,
          type: 'numericColumn',
          filter: 'number',
          valueFormatter: ({ value }: { value: number | null }) => (value != null ? fmtCurrency(value) : '-'),
          cellStyle: { backgroundColor: color?.bg },
        },
        {
          field: `offerte.${key}.delta_prezzo_media`,
          headerName: 'Δ Media',
          width: 100,
          type: 'numericColumn',
          filter: 'number',
          valueGetter: (params: any) => {
             if (params.node?.rowPinned) return null
             try {
                const data = params.data;
                const price = data?.offerte?.[key]?.prezzo_unitario;
                const mean = data?.media_prezzi;
                if (price != null && mean != null) return price - mean;
             } catch { return null }
             return null
          },
          valueFormatter: ({ value }: { value: number | null }) =>
            value != null && Math.abs(value) >= 0.01 ? `${value > 0 ? '+' : ''}${fmtCurrency(value)}` : '-',
          cellStyle: (params: any) => ({
            backgroundColor: color?.bg,
            ...getDeltaStyle(params.value ?? 0),
          }),
        },
        {
          field: `offerte.${key}.delta_prezzo_progetto`,
          headerName: 'Δ P.U.',
          width: 100,
          type: 'numericColumn',
          filter: 'number',
          valueGetter: (params: any) => {
            if (params.node?.rowPinned) return null
            const data = params.data;
            const price = data?.offerte?.[key]?.prezzo_unitario;
            const projPrice = data?.prezzo_unitario_progetto;
            if (price != null && projPrice != null) return price - projPrice;
            return null;
          },
          valueFormatter: ({ value }: { value: number | null }) =>
            value != null && Math.abs(value) >= 0.01 ? `${value > 0 ? '+' : ''}${fmtCurrency(value)}` : '-',
          cellStyle: (params: any) => ({
            backgroundColor: color?.bg,
            ...getDeltaStyle(params.value ?? 0),
          }),
        },
        {
          field: `offerte.${key}.importo_totale`,
          headerName: 'Importo',
          width: 120,
          type: 'numericColumn',
          filter: 'number',
          valueFormatter: ({ value }: { value: number | null }) => (value != null ? fmtCurrency(value) : '-'),
          cellStyle: (params: any) => ({ 
              backgroundColor: color?.bg, 
              fontWeight: params.node && params.node.rowPinned ? '800' : 'normal',
              fontSize: params.node && params.node.rowPinned ? '14px' : undefined,
              color: params.node && params.node.rowPinned ? 'hsl(var(--foreground))' : undefined,
          }),
        },
        {
          field: `offerte.${key}.delta_importo_progetto`,
          headerName: 'Δ Imp.',
          width: 120,
          type: 'numericColumn',
          filter: 'number',
          valueGetter: (params: any) => {
            const data = params.data;
            const amount = data?.offerte?.[key]?.importo_totale;
            const projAmount = data?.importo_totale_progetto; // In pinned row, this is total proj sum
            
            // For pinned row, we already calculated delta
            if (params.node?.rowPinned) {
                 return data?.offerte?.[key]?.delta_importo_progetto;
            }

            if (amount != null && projAmount != null) return amount - projAmount;
            return null;
          },
          valueFormatter: ({ value }: { value: number | null }) =>
            value != null && Math.abs(value) >= 0.01 ? `${value > 0 ? '+' : ''}${fmtCurrency(value)}` : '-',
          cellStyle: (params: any) => ({
            backgroundColor: color?.bg,
            borderRight: `2px solid ${color?.border}`,
            fontWeight: params.node && params.node.rowPinned ? '800' : 'normal',
            fontSize: params.node && params.node.rowPinned ? '14px' : undefined,
            ...getDeltaStyle(params.value ?? 0),
          }),
        },
      ],
    }
  })
})

const columns = computed(() => [...baseColumns, ...companyColumns.value])

const gridConfig = computed(() => ({
  columns: columns.value,
  defaultColDef: {
    sortable: true,
    resizable: true,
    suppressHeaderMenuButton: true,
  },
  rowHeight: 48,
  headerHeight: 48,
  groupHeaderHeight: 40,
  rowClassRules: {
    'ag-row-detail-active': (params: any) => {
      if (!selectedItem.value) return false
      if (params.data.codice && selectedItem.value.codice) {
        return params.data.codice === selectedItem.value.codice
      }
      return params.data === selectedItem.value
    }
  }
}))

// Toolbar State
const searchText = ref('')

// Import Logic
const isImportModalOpen = ref(false)
const handleImportSuccess = async () => {
  isImportModalOpen.value = false
  await refresh()
}
</script>

<template>
  <div class="h-full flex flex-col">
    <DataGridPage
      title="Confronto Offerte"
      subtitle="Round e Imprese"
      :grid-config="gridConfig"
      :row-data="rows"
      :pinned-bottom-row-data="pinnedBottomRows"
      :loading="isLoading"
      empty-state-title="Nessuna voce"
      empty-state-message="Carica un ritorno di gara per vedere il confronto."
      
      :show-toolbar="false"
      :filter-text="searchText"
      :context-extras="gridContext"
      @row-dblclick="openDetail"
      @grid-ready="onGridReady"
    >
      <!-- Meta: Item Count -->
      <template #actions>
        <div class="flex items-center gap-2">
           <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
              <Icon name="heroicons:list-bullet" class="w-3.5 h-3.5" />
              {{ rows.length }} voci
           </span>
        </div>
      </template>

      <!-- Toolbar Slot -->
      <template #pre-grid>
        <ClientOnly>
          <Teleport to="#topbar-actions-portal">
        <PageToolbar
            v-model="searchText"
            search-placeholder="Cerca voce..."
            class="!py-0"
          >
            <template #left>
               <div v-if="selectedRound || selectedCompany" class="flex items-center gap-2 ml-4">
                  <UBadge v-if="selectedRound" color="primary" variant="soft" class="gap-1">
                    <span>Round {{ selectedRound }}</span>
                    <UButton
                      icon="i-heroicons-x-mark"
                      color="primary"
                      variant="link"
                      size="xs"
                      class="p-0 h-4 w-4"
                      @click="selectedRound = null"
                    />
                  </UBadge>
                  <UBadge v-if="selectedCompany" color="primary" variant="soft" class="gap-1">
                    <span>{{ selectedCompany }}</span>
                    <UButton
                      icon="i-heroicons-x-mark"
                      color="primary"
                      variant="link"
                      size="xs"
                      class="p-0 h-4 w-4"
                      @click="selectedCompany = null"
                    />
                  </UBadge>
               </div>
            </template>

            <template #right>
              <UPopover>
                <UButton
                  :color="selectedRound ? 'primary' : 'neutral'"
                  :variant="selectedRound ? 'soft' : 'outline'"
                  size="sm"
                  icon="i-heroicons-funnel"
                  trailing-icon="i-heroicons-chevron-down"
                >
                  {{ selectedRound ? `Round ${selectedRound}` : 'Round' }}
                </UButton>
                <template #content>
                  <div class="p-2 min-w-[160px]">
                    <p class="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-2 px-2">Seleziona Round</p>
                    <div class="space-y-1">
                      <button
                        class="filter-menu-item"
                        :class="{ 'filter-menu-item--active': !selectedRound }"
                        @click="selectedRound = null"
                      >
                         <UIcon v-if="!selectedRound" name="i-heroicons-check" class="w-4 h-4" />
                         <span :class="{ 'ml-6': selectedRound }">Tutti i round</span>
                      </button>
                      <button
                        v-for="r in roundOptions"
                        :key="r.numero"
                        class="filter-menu-item"
                        :class="{ 'filter-menu-item--active': selectedRound === String(r.numero) }"
                        @click="selectedRound = String(r.numero)"
                      >
                         <UIcon v-if="selectedRound === String(r.numero)" name="i-heroicons-check" class="w-4 h-4" />
                         <span :class="{ 'ml-6': selectedRound !== String(r.numero) }">{{ r.label }}</span>
                      </button>
                    </div>
                  </div>
                </template>
              </UPopover>

              <UPopover>
                <UButton
                  :color="selectedCompany ? 'primary' : 'neutral'"
                  :variant="selectedCompany ? 'soft' : 'outline'"
                  size="sm"
                  icon="i-heroicons-building-office-2"
                  trailing-icon="i-heroicons-chevron-down"
                >
                  {{ selectedCompany || 'Impresa' }}
                </UButton>
                <template #content>
                  <div class="p-2 min-w-[180px]">
                    <p class="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-2 px-2">Seleziona Impresa</p>
                    <div class="space-y-1">
                       <button
                         class="filter-menu-item"
                         :class="{ 'filter-menu-item--active': !selectedCompany }"
                         @click="selectedCompany = null"
                       >
                         <UIcon v-if="!selectedCompany" name="i-heroicons-check" class="w-4 h-4" />
                         <span :class="{ 'ml-6': selectedCompany }">Tutte le imprese</span>
                       </button>
                       <button
                         v-for="c in companyOptions"
                         :key="c.nome"
                         class="filter-menu-item"
                         :class="{ 'filter-menu-item--active': selectedCompany === c.nome }"
                         @click="selectedCompany = c.nome"
                       >
                         <UIcon v-if="selectedCompany === c.nome" name="i-heroicons-check" class="w-4 h-4" />
                         <span :class="{ 'ml-6': selectedCompany !== c.nome }">{{ c.nome }}</span>
                       </button>
                    </div>
                  </div>
                </template>
              </UPopover>
            </template>
        </PageToolbar>
          </Teleport>
        </ClientOnly>
      </template>

    </DataGridPage>

    <Teleport to="body">
      <div v-if="isImportModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6">
        <div 
          class="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm transition-opacity"
          @click="isImportModalOpen = false"
        />
        <div class="relative z-[105] w-full max-w-5xl h-[85vh] rounded-[var(--card-radius)] shadow-2xl overflow-hidden bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex flex-col">
           <ImportWizard 
             :project-id="projectId"
             :estimate-id="estimateId"
             @success="handleImportSuccess"
             @close="isImportModalOpen = false"
           />
        </div>
      </div>
    </Teleport>
  </div>
</template>
