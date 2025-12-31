
<script setup lang="ts">
/**
 * Project Pricelist Page (Listino di Progetto)
 * 
 * formally identical to Estimate page but adapted for Price Catalog.
 * Shows WBS 06 and 07 only.
 */

import { useRoute, useRouter } from 'vue-router'
import { usePriceListGridConfig } from '~/composables/estimates/usePriceListGridConfig'
import type { ApiPriceListItem } from '~/types/api'
import type { Project } from '#types'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { GridApi, GridReadyEvent, RowNode } from 'ag-grid-community'
import { useCurrentContext } from '~/composables/useCurrentContext'
import { useWbsTree, type WithWbsHierarchy } from '~/composables/useWbsTree'
import { useSidebarModules } from '~/composables/useSidebarModules'
import WbsModule from '~/components/sidebar/modules/WbsModule.vue'
import DataGridPage from '~/components/layout/DataGridPage.vue'
import PageToolbar from '~/components/layout/PageToolbar.vue'
import { formatCurrency } from '~/lib/formatters'

// ---------------------------------------------------------------------------
// Layout & Page Meta
// ---------------------------------------------------------------------------
definePageMeta({
  disableDefaultSidebar: true,
})

const route = useRoute()
const router = useRouter()
const projectId = route.params.id as string
const rawEstimateId = computed(() => {
  const value = route.query.estimateId
  return typeof value === 'string' && value !== 'null' && value !== 'undefined' ? value : null
})
const selectedEstimateId = ref<string | null>(rawEstimateId.value)
const { setCurrentEstimate } = useCurrentContext()

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
const priceListUrl = computed(() => {
  if (!activeEstimateId.value) return ''
  const base = `/api/projects/${projectId}/estimates/${activeEstimateId.value}/price-list`
  
  // Forward query params for rounds/companies
  const query = new URLSearchParams()
  if (route.query.round) query.set('round', route.query.round as string)
  if (route.query.company) query.set('company', route.query.company as string)
  
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return `${base}${suffix}`
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

// Grid Stats
const currentTotalAmount = ref(0)
const formattedTotalAmount = computed(() => formatCurrency(currentTotalAmount.value))

// Toolbar State
const searchText = ref('')
const gridApi = ref<GridApi | null>(null)
const { exportToXlsx } = useDataGridExport(gridApi)

const updateGridStats = () => {
  if (!gridApi.value) return
  let sum = 0
  gridApi.value.forEachNodeAfterFilter((node: any) => {
    if (node.data) sum += (node.data.total_amount || 0)
  })
  currentTotalAmount.value = sum
}

// Watch row data changes to update stats initially (before grid interaction)
watch(filteredRowData, () => {
  // If grid is not ready yet, we can't iterate nodes, but we can fallback to simple reduce
  if (!gridApi.value) {
     currentTotalAmount.value = filteredRowData.value.reduce((sum, item) => sum + (item.total_amount || 0), 0)
  } else {
     // If grid is ready, wait for model update or force recalc
     requestAnimationFrame(updateGridStats)
  }
}, { immediate: true })

const { gridConfig } = usePriceListGridConfig(filteredRowData)

const pageTitle = computed(() => 'Listino')
const pageSubtitle = computed(() => 
  selectedEstimateName.value || (activeEstimateId.value ? 'Listino Preventivo' : 'Listino di Progetto')
)

const onGridReady = (params: any) => {
  gridApi.value = params.api
  params.api.addEventListener('modelUpdated', updateGridStats)
  params.api.addEventListener('filterChanged', updateGridStats)
}

const handleReset = () => {
  searchText.value = ''
  onWbsNodeSelected(null)
  gridApi.value?.setFilterModel(null)
  gridApi.value?.setGridOption('quickFilterText', '')
}

const handleExport = () => {
  exportToXlsx('listino-items')
}

const { registerModule, unregisterModule, toggleVisibility, isVisible: sidebarVisible, setActiveModule, showSidebar } = useSidebarModules()
const { showDefaultSidebar } = useAppSidebar()

const wbsButtonTitle = computed(() => {
  return sidebarVisible.value ? 'Nascondi WBS' : 'Mostra WBS'
})

onMounted(() => {
  registerModule({
    id: 'wbs',
    label: 'WBS',
    icon: 'heroicons:squares-2x2',
    component: WbsModule,
    props: {
      nodes: wbsNodes,
      selectedNodeId: computed(() => selectedWbsNode.value?.id ?? null),
      onNodeSelected: (node: typeof selectedWbsNode.value | null) => onWbsNodeSelected(node),
    },
  })
  setActiveModule('wbs')
})

onUnmounted(() => {
  unregisterModule('wbs')
})

const toggleWbsSidebar = () => {
  if (!sidebarVisible.value) {
    setActiveModule('wbs')
    showSidebar()
  } else {
    toggleVisibility()
  }
}
</script>



<template>
  <DataGridPage
    :title="pageTitle"
    :grid-config="gridConfig"
    :row-data="filteredRowData as any"
    :loading="loading"
    empty-state-title="Nessuna voce trovata"
    empty-state-message="Il listino non contiene ancora voci."
    
    :show-toolbar="false"
    :filter-text="searchText"
    @grid-ready="onGridReady"
  >
    <!-- Header Meta: Context + Stats -->
    <template #header-meta>
       <div class="flex items-center gap-2">
         <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
            {{ pageSubtitle }}
         </span>
         <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
            <Icon name="heroicons:list-bullet" class="w-3.5 h-3.5" />
            {{ filteredRowData.length }} voci
         </span>
         <span v-if="currentTotalAmount > 0" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Icon name="heroicons:currency-euro" class="w-3.5 h-3.5" />
            {{ formattedTotalAmount }}
         </span>
       </div>
    </template>

    <!-- Header Actions (WBS/View Controls) -->
    <template #actions>
      <UButton
        :icon="sidebarVisible ? 'i-heroicons-view-columns' : 'i-heroicons-view-columns'"
        :color="sidebarVisible ? 'primary' : 'neutral'"
        variant="ghost"
        size="sm"
        :label="sidebarVisible ? 'WBS' : 'Mostra WBS'"
        :title="wbsButtonTitle"
        @click="toggleWbsSidebar"
      />
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

        <!-- The Toolbar -->
        <ClientOnly>
          <Teleport to="#topbar-actions-portal">
        <PageToolbar
          v-model="searchText"
          search-placeholder="Cerca voce..."
          class="!py-0"
        >
          <template #left>
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
                  @click="onWbsNodeSelected(null)"
                />
              </UBadge>
          </template>

          <template #right>
            <button
               v-if="searchText || selectedWbsNode"
               class="flex items-center justify-center h-9 px-4 rounded-full text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--background))] hover:text-[hsl(var(--foreground))] transition-colors"
               @click="handleReset"
            >
              <Icon name="heroicons:arrow-path" class="w-4 h-4 mr-2" />
              Reset
            </button>     

            <UButton
               color="neutral"
               variant="ghost"
               icon="i-heroicons-arrow-down-tray"
               class="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
               @click="handleExport"
            >
               Esporta
            </UButton>
          </template>
        </PageToolbar>
          </Teleport>
        </ClientOnly>
    </template>

  </DataGridPage>
</template>
