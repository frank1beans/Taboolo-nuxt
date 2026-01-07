<script setup lang="ts">
/**
 * Shared page shell for estimate and offer item views.
 * Handles fetching, WBS filtering, totals and grid layout.
 */
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useColorMode } from '#imports'
import type { GridApi, GridReadyEvent, RowNode } from 'ag-grid-community'
import DataGridPage from '~/components/layout/DataGridPage.vue'
import { useEstimateGridConfig, type EstimateItem } from '~/composables/estimates/useEstimateGridConfig'
import { useWbsTree } from '~/composables/useWbsTree'
import { useCurrentContext } from '~/composables/useCurrentContext'
import { useSidebarModules } from '~/composables/useSidebarModules'
import { useSidebarLayout } from '~/composables/useSidebarLayout'
import WbsModule from '~/components/sidebar/modules/WbsModule.vue'
import AssetsModule from '~/components/sidebar/modules/AssetsModule.vue'
import { useProjectTree } from '~/composables/useProjectTree'
import PriceSummaryDisplay from '~/components/common/PriceSummaryDisplay.vue'
import { formatCurrency } from '~/lib/formatters'

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
const colorMode = useColorMode()
const { setCurrentEstimate, currentProject, currentEstimate } = useCurrentContext()

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

const { data: items, status: itemsStatus, refresh: refreshItems } = await useFetch<EstimateItem[]>(
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
const rowData = computed<EstimateItem[]>(() => items.value || [])

const { wbsNodes, selectedWbsNode, filteredRowData, onWbsNodeSelected } = useWbsTree(rowData)
const { registerModule, unregisterModule, toggleVisibility, isVisible: sidebarVisible, setActiveModule, showSidebar } = useSidebarModules()
const { showDefaultSidebar } = useSidebarLayout()
const { gridConfig } = useEstimateGridConfig(filteredRowData)
const totalAmount = ref(0)
const gridApiRef = ref<GridApi<EstimateItem> | null>(null)

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
  return (items.value || []).reduce((sum: number, item: EstimateItem) => sum + (item.project?.amount || 0), 0) || 0
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const onGridReady = (params: GridReadyEvent<any>) => {
  gridApiRef.value = params.api
  params.api.addEventListener('modelUpdated', calculateFromGrid)
  calculateFromGrid()
}

const formattedTotal = computed(() => formatCurrency(totalAmount.value))

const wbsButtonTitle = computed(() => (
  sidebarVisible.value ? 'Nascondi WBS' : 'Mostra WBS'
))

const toggleWbsSidebar = () => {
  if (!sidebarVisible.value) {
    setActiveModule('wbs')
    showSidebar()
  } else {
    toggleVisibility()
  }
}

onMounted(() => {
  registerModule({
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

  // Register Assets Module
  const { treeNodes: contextNodes } = useProjectTree(currentProject, currentEstimate)
  registerModule({
      id: 'assets',
      label: 'Assets',
      icon: 'heroicons:folder-open',
      order: 0,
      component: AssetsModule,
      props: {
          nodes: contextNodes,
          hasProject: computed(() => !!currentProject.value),
          activeNodeId: computed(() => estimateId.value ? `detail-${estimateId.value}` : null),
          loading: computed(() => false)
      }
  })

  setActiveModule('assets')
})

onUnmounted(() => {
  unregisterModule('wbs')
  unregisterModule('assets')
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
    :toolbar-placeholder="toolbarPlaceholder"
    :export-filename="exportFilename"
    :empty-state-title="emptyTitle"
    :empty-state-message="emptyMessage"
    @grid-ready="onGridReady"
  >
    <!-- ACTIONS -->
    <template #actions>
      <UButton
        :icon="sidebarVisible ? 'i-heroicons-view-columns' : 'i-heroicons-view-columns'"
        :color="sidebarVisible ? 'primary' : 'neutral'"
        variant="ghost"
        size="sm"
        :title="wbsButtonTitle"
        label="WBS"
        @click="toggleWbsSidebar"
      />

      <UBadge v-if="selectedWbsNode" color="primary" variant="soft" class="gap-1.5 pl-2 pr-1 py-1">
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
