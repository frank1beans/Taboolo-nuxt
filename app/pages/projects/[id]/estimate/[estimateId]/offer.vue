<script setup lang="ts">
/**
 * Dedicated Offer Details Page
 * Displays aggregated offer items filtered by Round or Company.
 */

import { useRoute } from 'vue-router'
import { useEstimateGridConfig, type EstimateItem } from '~/composables/estimates/useEstimateGridConfig'
import { ref, computed } from 'vue'
import { useCurrentContext } from '~/composables/useCurrentContext'

definePageMeta({
  breadcrumb: 'Dettaglio Offerta',
})

const route = useRoute()
const projectId = route.params.id as string
const estimateId = route.params.estimateId as string
const colorMode = useColorMode()
const { setCurrentEstimate } = useCurrentContext()

// Ensure context is set
await setCurrentEstimate(estimateId).catch((err) => console.error('Failed to set current estimate', err))

// Fetch Title Data (Baseline Estimate)
const { data: estimate } = await useFetch(`/api/projects/${projectId}/estimate/${estimateId}`)

// Fetch Offer Items (Reactive to filters)
const { data: items, status: itemsStatus } = await useFetch<EstimateItem[]>(
  `/api/projects/${projectId}/estimate/${estimateId}/items`,
  {
    query: computed(() => route.query),
    watch: [() => route.query]
  }
)

const loading = computed(() => itemsStatus.value === 'pending')
const rowData = computed(() => items.value || [])

// ---------------------------------------------------------------------------
// Grid Setup
// ---------------------------------------------------------------------------
const { gridConfig } = useEstimateGridConfig(rowData)
const totalAmount = ref(0)
const gridApiRef = ref<any>(null)

const calculateTotal = () => {
    // Simple sum of displayed rows
    if (!rowData.value) return 0
    return rowData.value.reduce((sum, item) => {
        const val = Number(item.project?.amount);
        return sum + (Number.isNaN(val) ? 0 : val)
    }, 0)
}

// Watch data to update total
watch(rowData, () => {
    totalAmount.value = calculateTotal()
}, { immediate: true })

const onGridReady = (params: any) => {
  gridApiRef.value = params.api
  // Recalculate on filter changes if needed, but for now robust sum is enough
}

const formattedTotal = computed(() => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(totalAmount.value)
})

const pageTitle = computed(() => {
    if (route.query.round) return `Round ${route.query.round}`
    if (route.query.company) return `${route.query.company}`
    return 'Dettaglio Offerta'
})
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-100px)]">
    <UCard class="flex-1 border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col min-h-0">
        <template #header>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
              <div>
                <p class="text-xs uppercase tracking-wide font-medium text-[hsl(var(--muted-foreground))]">
                    {{ estimate?.name }}
                </p>
                <h1 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <UIcon name="i-heroicons-banknotes" class="w-5 h-5 text-primary" />
                  {{ pageTitle }}
                </h1>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <UBadge v-if="rowData.length > 0" color="neutral" variant="soft">
                <Icon name="heroicons:list-bullet" class="w-3.5 h-3.5 mr-1" />
                {{ rowData.length }} voci
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
          :row-data="rowData"
          :loading="loading"
          class="flex-1 min-h-0"
          toolbar-placeholder="Cerca voce offerta..."
          export-filename="offerta-items"
          empty-state-title="Nessuna voce trovata"
          empty-state-message="Nessuna voce presente per i filtri selezionati."
          @grid-ready="onGridReady"
        />
    </UCard>
  </div>
</template>
