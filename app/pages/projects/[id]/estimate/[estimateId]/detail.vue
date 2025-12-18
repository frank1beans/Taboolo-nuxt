<script setup lang="ts">
/**
 * Estimate Detail Page
 * 
 * Uses default layout with inline WBS sidebar.
 */

import { useRoute } from 'vue-router'
import { useEstimateGridConfig, type EstimateItem } from '~/composables/estimates/useEstimateGridConfig'
import { ref, computed, watch, nextTick } from 'vue'
import { useCurrentContext } from '~/composables/useCurrentContext'

// ---------------------------------------------------------------------------
// Layout & Page Meta
// ---------------------------------------------------------------------------
definePageMeta({
  breadcrumb: 'Preventivo',
})

const route = useRoute()
const projectId = route.params.id as string
const estimateId = route.params.estimateId as string
const colorMode = useColorMode()
const { setCurrentEstimate } = useCurrentContext()

await setCurrentEstimate(estimateId).catch((err) => console.error('Failed to set current estimate', err))

// WBS Sidebar visibility
const wbsSidebarVisible = ref(true)

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------
const { data: estimate, status: estimateStatus } = await useFetch(`/api/projects/${projectId}/estimate/${estimateId}`)

// Reactive fetch that updates when query params change
const { data: items, status: itemsStatus } = await useFetch<EstimateItem[]>(
  `/api/projects/${projectId}/estimate/${estimateId}/items`,
  {
    query: computed(() => route.query),
    watch: [() => route.query]
  }
)

const loading = computed(() => estimateStatus.value === 'pending' || itemsStatus.value === 'pending')
const rowData = computed(() => items.value || [])

// ---------------------------------------------------------------------------
// WBS Tree Types and State
// ---------------------------------------------------------------------------
interface WbsNode {
  id: string
  code: string
  name: string
  level: number
  children?: WbsNode[]
}

const selectedWbsNode = ref<WbsNode | null>(null)

const wbsNodes = computed<WbsNode[]>(() => {
  const nodeMap = new Map<string, WbsNode>()
  
  for (const item of rowData.value as any[]) {
    const hierarchy = item.wbs_hierarchy || {}
    let pathParts: string[] = []
    
    for (let level = 1; level <= 7; level++) {
      const key = `wbs0${level}`
      const value = hierarchy[key]
      
      if (!value) continue
      
      pathParts.push(value)
      const fullPath = pathParts.join('/')
      
      if (!nodeMap.has(fullPath)) {
        nodeMap.set(fullPath, {
          id: fullPath,
          code: value.length > 25 ? value.substring(0, 25) + '...' : value,
          name: value,
          level: level,
          children: [],
        })
      }
      
      if (pathParts.length > 1) {
        const parentPath = pathParts.slice(0, -1).join('/')
        const parentNode = nodeMap.get(parentPath)
        const currentNode = nodeMap.get(fullPath)!
        
        if (parentNode && !parentNode.children!.find(c => c.id === currentNode.id)) {
          parentNode.children!.push(currentNode)
        }
      }
    }
  }
  
  const rootNodes: WbsNode[] = []
  for (const [path, node] of nodeMap) {
    if (!path.includes('/')) {
      rootNodes.push(node)
    }
  }
  
  const sortChildren = (nodes: WbsNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name))
    for (const node of nodes) {
      if (node.children?.length) {
        sortChildren(node.children)
      }
    }
  }
  
  sortChildren(rootNodes)
  return rootNodes
})

// ---------------------------------------------------------------------------
// WBS Selection & Filtering
// ---------------------------------------------------------------------------
const onWbsNodeSelected = (node: WbsNode | null) => {
  selectedWbsNode.value = node
}

const filteredRowData = computed(() => {
  if (!selectedWbsNode.value) {
    return rowData.value
  }
  
  const selectedPath = selectedWbsNode.value.id
  const pathSegments = selectedPath.split('/')
  
  return (rowData.value as any[]).filter(item => {
    const hierarchy = item.wbs_hierarchy || {}
    const itemPath: string[] = []
    
    for (let level = 1; level <= 7; level++) {
      const key = `wbs0${level}`
      const value = hierarchy[key]
      if (value) {
        itemPath.push(value)
      }
    }
    
    if (pathSegments.length > itemPath.length) {
      return false
    }
    
    for (let i = 0; i < pathSegments.length; i++) {
      if (itemPath[i] !== pathSegments[i]) {
        return false
      }
    }
    
    return true
  })
})

// ---------------------------------------------------------------------------
// Grid Setup
// ---------------------------------------------------------------------------
const { gridConfig } = useEstimateGridConfig(filteredRowData)

const totalAmount = ref(0)
const gridApiRef = ref<any>(null)

const calculateFromData = () => {
  let sum = 0
  for (const item of filteredRowData.value) {
    if (item.project && typeof item.project.amount === 'number') {
      sum += item.project.amount
    }
  }
  totalAmount.value = sum
}

const calculateFromGrid = () => {
  if (!gridApiRef.value) {
    calculateFromData()
    return
  }
  let sum = 0
  gridApiRef.value.forEachNodeAfterFilter((node: any) => {
    if (node.data && node.data.project && typeof node.data.project.amount === 'number') {
      sum += node.data.project.amount
    }
  })
  totalAmount.value = sum
}

const onGridReady = (params: any) => {
  gridApiRef.value = params.api
  
  // Listen to modelUpdated to update total whenever rows/filters change
  params.api.addEventListener('modelUpdated', calculateFromGrid)
  
  calculateFromGrid()
}

const formattedTotal = computed(() => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(totalAmount.value)
})
</script>

<template>
  <div class="flex gap-4">
    <!-- Main Content -->
    <div class="flex-1 min-w-0">
      <UCard class="border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <template #header>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
              <div>
                <p class="text-xs uppercase tracking-wide font-medium text-[hsl(var(--muted-foreground))]">
                  Voci Preventivo
                </p>
                <h1 class="text-lg font-bold text-gray-900 dark:text-white">
                  <span v-if="route.query.round" class="mr-2 text-primary-500">Round {{ route.query.round }} -</span>
                  <span v-if="route.query.company" class="mr-2 text-primary-500">{{ route.query.company }} -</span>
                  {{ estimate?.name || 'Dettaglio Preventivo' }}
                </h1>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <UButton
                :icon="wbsSidebarVisible ? 'i-heroicons-sidebar' : 'i-heroicons-sidebar'"
                :color="wbsSidebarVisible ? 'primary' : 'neutral'"
                variant="ghost"
                size="sm"
                :title="wbsSidebarVisible ? 'Chiudi WBS' : 'Apri WBS'"
                label="WBS"
                @click="wbsSidebarVisible = !wbsSidebarVisible"
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
                {{ filteredRowData.length }} {{ filteredRowData.length === 1 ? 'voce' : 'voci' }}
              </UBadge>
              <div
                :class="[
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-lg',
                  colorMode.value === 'dark'
                    ? 'bg-[hsl(var(--success)/0.2)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.3)]'
                    : 'bg-[hsl(var(--success-light))] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.2)]'
                ]"
              >
                <Icon name="heroicons:currency-euro" class="w-5 h-5" />
                <span>Totale: {{ formattedTotal }}</span>
              </div>
            </div>
          </div>
        </template>

        <DataGrid
          :config="gridConfig"
          :row-data="filteredRowData"
          :loading="loading"
          height="calc(100vh - 240px)"
          toolbar-placeholder="Cerca voce..."
          export-filename="preventivo-items"
          empty-state-title="Nessuna voce trovata"
          empty-state-message="Questo preventivo non contiene ancora voci."
          @grid-ready="onGridReady"
        />
      </UCard>
    </div>

    <!-- WBS Sidebar -->
    <WbsSidebar
      v-if="wbsSidebarVisible"
      :nodes="wbsNodes"
      :visible="true"
      @node-selected="onWbsNodeSelected"
      @update:visible="(val) => wbsSidebarVisible = val"
    />
  </div>
</template>
