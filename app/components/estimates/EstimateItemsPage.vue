<script setup lang="ts">
/**
 * Shared page shell for estimate and offer item views.
 * Handles fetching, WBS filtering, totals and grid layout.
 */
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import type { GridApi, GridReadyEvent } from 'ag-grid-community'
import DataGridPage from '~/components/layout/DataGridPage.vue'
import PageToolbar from '~/components/layout/PageToolbar.vue'
import { useEstimateGridConfig, type EstimateItem } from '~/composables/estimates/useEstimateGridConfig'
import { useWbsTree } from '~/composables/useWbsTree'
import { useCurrentContext } from '~/composables/useCurrentContext'
import { useDataGridExport } from '~/composables/useDataGridExport'
import { usePageSidebarModule } from '~/composables/useSidebarModules'
import WbsModule from '~/components/sidebar/modules/WbsModule.vue'
import SidebarActionsModule from '~/components/sidebar/modules/SidebarActionsModule.vue'
import PriceSummaryDisplay from '~/components/common/PriceSummaryDisplay.vue'
import { useActionsStore } from '~/stores/actions'
import type { Action } from '~/types/actions'

interface Props {
  subtitle: string
  emptyTitle: string
  emptyMessage: string
  exportFilename: string
  defaultTitle: string
  toolbarPlaceholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  toolbarPlaceholder: 'Cerca voce...',
})

const route = useRoute()
const projectId = computed(() => route.params.id as string)
const estimateId = computed(() => route.params.estimateId as string)
const { setCurrentEstimate } = useCurrentContext()

await setCurrentEstimate(estimateId.value).catch((err) => console.error('Failed to set current estimate', err))

watch(
  () => estimateId.value,
  (val) => {
    if (val) {
      setCurrentEstimate(val).catch((err) => console.error('Failed to set current estimate', err))
    }
  },
)

// Only fetch when we have valid projectId and estimateId
const hasValidIds = computed(() => Boolean(projectId.value && estimateId.value))

const { data: estimate, status: estimateStatus, refresh: refreshEstimate } = await useFetch(
  () => (projectId.value && estimateId.value 
    ? `/api/projects/${projectId.value}/estimate/${estimateId.value}` 
    : ''),
  { immediate: hasValidIds.value }
)

const { data: items, status: itemsStatus, refresh: refreshItems } = await useFetch<EstimateItem[] | { items: EstimateItem[] }>(
  () => (projectId.value && estimateId.value 
    ? `/api/projects/${projectId.value}/estimate/${estimateId.value}/items` 
    : ''),
  {
    query: computed(() => route.query),
    watch: [() => route.query, projectId, estimateId],
    immediate: hasValidIds.value
  },
)

// Trigger fetch when IDs become valid
watch(hasValidIds, (valid) => {
  if (valid) {
    refreshEstimate()
    refreshItems()
  }
})

const loading = computed(() => estimateStatus.value === 'pending' || itemsStatus.value === 'pending')
const itemsList = computed<EstimateItem[]>(() => {
  if (Array.isArray(items.value)) {
    return items.value
  }
  if (items.value && Array.isArray(items.value.items)) {
    return items.value.items
  }
  return []
})
const rowData = computed<EstimateItem[]>(() => itemsList.value)

const { wbsNodes, selectedWbsNode, filteredRowData, onWbsNodeSelected } = useWbsTree(rowData)
const { gridConfig } = useEstimateGridConfig(filteredRowData)
const totalAmount = ref(0)
const gridApiRef = ref<GridApi<EstimateItem> | null>(null)
const { exportToXlsx } = useDataGridExport(gridApiRef)
const actionsStore = useActionsStore()
const actionOwner = 'page:estimate-items'
const searchText = ref('')

const calculateFromGrid = () => {
  if (!gridApiRef.value) {
    totalAmount.value = filteredRowData.value.reduce((sum: number, item: EstimateItem) => sum + (item.project?.amount || 0), 0)
    return
  }
  let sum = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gridApiRef.value.forEachNodeAfterFilter((node: any) => {
    if (node.data && node.data.project && typeof node.data.project.amount === 'number') {
      sum += node.data.project.amount
    }
  })
  totalAmount.value = sum
}

const grandTotal = computed(() => {
  return itemsList.value.reduce((sum: number, item: EstimateItem) => sum + (item.project?.amount || 0), 0) || 0
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const onGridReady = (params: GridReadyEvent<any>) => {
  gridApiRef.value = params.api
  params.api.addEventListener('modelUpdated', calculateFromGrid)
  calculateFromGrid()
}

const handleReset = () => {
  searchText.value = ''
  onWbsNodeSelected(null)
  if (gridApiRef.value) {
    gridApiRef.value.setFilterModel(null)
    gridApiRef.value.setGridOption('quickFilterText', '')
  }
}

const registerAction = (action: Action) => {
  actionsStore.registerAction(action, { owner: actionOwner, overwrite: true })
}

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
      'grid.exportExcel',
      'grid.resetFilters',
    ],
  },
})

onMounted(() => {
  registerAction({
    id: 'grid.exportExcel',
    label: 'Esporta in Excel',
    description: 'Esporta dati in Excel',
    category: 'Tabelle',
    scope: 'selection',
    icon: 'i-heroicons-arrow-up-tray',
    keywords: ['export', 'excel', 'tabella'],
    handler: () => exportToXlsx(props.exportFilename),
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

const pageTitle = computed(() => {
  const roundLabel = route.query.round ? `Round ${route.query.round}` : ''
  const companyLabel = route.query.company ? `${route.query.company}` : ''
  const parts = [roundLabel, companyLabel].filter(Boolean)
  return parts.length
    ? `${parts.join(' - ')} - ${estimate.value?.name || props.defaultTitle}`
    : estimate.value?.name || props.defaultTitle
})
</script>

<template>
  <DataGridPage
    :title="pageTitle"
    :subtitle="subtitle"
    :grid-config="gridConfig"
    :row-data="filteredRowData as any"
    :loading="loading"
    :show-toolbar="false"
    :filter-text="searchText"
    :toolbar-placeholder="toolbarPlaceholder"
    :export-filename="exportFilename"
    :empty-state-title="emptyTitle"
    :empty-state-message="emptyMessage"
    @grid-ready="onGridReady"
  >
    <template #pre-grid>
      <ClientOnly>
        <Teleport to="#topbar-actions-portal">
          <PageToolbar
            v-model="searchText"
            :search-placeholder="toolbarPlaceholder"
            class="!py-0"
          />
        </Teleport>
      </ClientOnly>
    </template>

    <!-- ACTIONS -->
    <template #actions>
      <UBadge v-if="filteredRowData.length > 0" color="neutral" variant="soft">
        <Icon name="heroicons:list-bullet" class="w-3.5 h-3.5 mr-1" />
        {{ filteredRowData.length }} voci
      </UBadge>

      <PriceSummaryDisplay 
        :current="totalAmount" 
        :total="grandTotal" 
      />
    </template>

  </DataGridPage>
</template>
