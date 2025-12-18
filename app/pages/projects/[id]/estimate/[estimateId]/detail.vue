<script setup lang="ts">
/**
 * Estimate Detail Page
 * 
 * Uses DataGridPage layout with inline WBS sidebar.
 */

import { useRoute } from 'vue-router'
import { useEstimateGridConfig, type EstimateItem } from '~/composables/estimates/useEstimateGridConfig'
import { useWbsTree } from '~/composables/useWbsTree'
import { ref, computed, watch } from 'vue'
import { useCurrentContext } from '~/composables/useCurrentContext'
import DataGridPage from '~/components/layout/DataGridPage.vue'

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
// WBS Logic (Extracted)
// ---------------------------------------------------------------------------
const { 
  wbsNodes, 
  selectedWbsNode, 
  wbsSidebarVisible, 
  filteredRowData, 
  onWbsNodeSelected 
} = useWbsTree(rowData)

// ---------------------------------------------------------------------------
// Grid Setup
// ---------------------------------------------------------------------------
const { gridConfig } = useEstimateGridConfig(filteredRowData)
const totalAmount = ref(0)
const gridApiRef = ref<any>(null)

const calculateFromGrid = () => {
    if (!gridApiRef.value) {
        // Fallback to data calculation
        totalAmount.value = filteredRowData.value.reduce((sum, item) => sum + (item.project?.amount || 0), 0)
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
  params.api.addEventListener('modelUpdated', calculateFromGrid)
  calculateFromGrid()
}

const formattedTotal = computed(() => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(totalAmount.value)
})

const pageTitle = computed(() => {
    const roundLabel = route.query.round ? `Round ${route.query.round}` : ''
    const companyLabel = route.query.company ? `${route.query.company}` : ''
    const parts = [roundLabel, companyLabel].filter(Boolean)
    return parts.length ? parts.join(' - ') + ' - ' + (estimate.value?.name || 'Dettaglio Preventivo') : (estimate.value?.name || 'Dettaglio Preventivo')
})
</script>

<template>
  <DataGridPage
    :title="pageTitle"
    subtitle="Voci Preventivo"
    :grid-config="gridConfig"
    :row-data="filteredRowData"
    :loading="loading"
    toolbar-placeholder="Cerca voce..."
    export-filename="preventivo-items"
    empty-state-title="Nessuna voce trovata"
    empty-state-message="Questo preventivo non contiene ancora voci."
    @grid-ready="onGridReady"
  >
    <!-- Actions Toolbar -->
    <template #actions>
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
        {{ filteredRowData.length }} voci
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
    </template>

    <!-- Sidebar -->
    <template #sidebar>
      <WbsSidebar
        v-if="wbsSidebarVisible"
        :nodes="wbsNodes"
        :visible="true"
        @node-selected="onWbsNodeSelected"
        @update:visible="(val) => wbsSidebarVisible = val"
      />
    </template>
  </DataGridPage>
</template>
