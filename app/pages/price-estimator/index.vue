<template>
  <div class="h-full">
    <MainPage>
      <template #header>
        <PageHeader title="Stima Prezzi" meta="Stima prezzi per voci non presenti nel prezzario" :divider="false">
          <template #rightSlot>
            <UButton
              v-if="result"
              variant="ghost"
              color="neutral"
              icon="i-heroicons-arrow-path"
              @click="reset"
            >
              Nuova ricerca
            </UButton>
          </template>
        </PageHeader>
      </template>

      <template #default>
        <!-- Scrollable Container -->
        <div class="h-full overflow-y-auto custom-scrollbar">
          <div class="max-w-5xl mx-auto space-y-6 pb-10">
            
            <!-- Search Input -->
            <div class="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm">
              <div class="space-y-4">
                <div>
                  <label class="text-sm font-medium text-[hsl(var(--foreground))] mb-2 block">
                    Descrivi la voce che stai cercando
                  </label>
                  <div class="relative">
                    <UTextarea
                      v-model="query"
                      placeholder="Es: pavimento gres porcellanato Marazzi formato 60x120 spessore 9mm finitura opaca"
                      :rows="4"
                      class="w-full"
                      autofocus
                    />
                  </div>
                  <p class="text-xs text-[hsl(var(--muted-foreground))] mt-2 flex items-center gap-1">
                    <UIcon name="i-heroicons-information-circle" class="w-4 h-4" />
                    Inserisci una descrizione dettagliata con materiale, dimensioni, spessore, marca e altre caratteristiche
                  </p>
                </div>
                
                <!-- Action Button -->
                <div class="flex items-center gap-3 pt-2">
                  <UButton
                    v-if="!result || isLoading"
                    color="primary"
                    size="lg"
                    :loading="isLoading"
                    :disabled="!query || query.length < 3"
                    icon="i-heroicons-sparkles"
                    @click="estimate()"
                  >
                    Stima Prezzo
                  </UButton>
                   <UButton
                    v-else
                    color="primary"
                    size="lg"
                    :loading="isLoading"
                    :disabled="!query || query.length < 3"
                    icon="i-heroicons-arrow-path"
                    @click="estimate()"
                  >
                    Aggiorna Stima
                  </UButton>
                  
                  <!-- Advanced Settings Toggle -->
                  <UButton
                    variant="ghost"
                    color="neutral"
                    size="sm"
                    @click="showAdvanced = !showAdvanced"
                  >
                    <UIcon :name="showAdvanced ? 'i-heroicons-chevron-up' : 'i-heroicons-adjustments-horizontal'" class="w-4 h-4" />
                    Opzioni Avanzate
                  </UButton>
                </div>
                
                <!-- Advanced Options -->
                <transition
                  enter-active-class="transition ease-out duration-200"
                  enter-from-class="opacity-0 -translate-y-2"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition ease-in duration-150"
                  leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 -translate-y-2"
                >
                  <div v-if="showAdvanced" class="pt-4 mt-4 border-t border-[hsl(var(--border))] grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <div class="flex justify-between mb-2">
                        <label class="text-xs font-medium text-[hsl(var(--foreground))]">
                          Voci da considerare
                        </label>
                        <span class="text-xs text-[hsl(var(--primary))] font-mono">{{ topK }}</span>
                      </div>
                      <input
                        v-model.number="topK"
                        type="range"
                        min="5"
                        max="30"
                        step="5"
                        class="w-full h-1.5 bg-[hsl(var(--muted))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--primary))]"
                      >
                    </div>
                    <div>
                      <div class="flex justify-between mb-2">
                        <label class="text-xs font-medium text-[hsl(var(--foreground))]">
                           Soglia di Similarità
                        </label>
                        <span class="text-xs text-[hsl(var(--primary))] font-mono">{{ Math.round(minSimilarity * 100) }}%</span>
                      </div>
                      <input
                        v-model.number="minSimilarity"
                        type="range"
                        min="0.3"
                        max="0.8"
                        step="0.05"
                        class="w-full h-1.5 bg-[hsl(var(--muted))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--primary))]"
                      >
                    </div>

                    
                    <!-- Unit Selection -->
                    <div v-if="unitOptions.length > 0" class="col-span-1 sm:col-span-2">
                      <div class="flex justify-between mb-2">
                        <label class="text-xs font-medium text-[hsl(var(--foreground))]">
                           Unità di Misura
                        </label>
                      </div>
                      <USelect 
                        v-model="selectedUnit"
                        :options="unitOptions"
                        option-attribute="label"
                        value-attribute="value"
                        placeholder="Seleziona unità..."
                        @change="() => { /* Optional: auto-trigger */ }"
                      />
                      <p class="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                        Seleziona l'unità per filtrare le voci considerate nella media.
                      </p>
                    </div>
                  </div>
                </transition>
              </div>
            </div>

            <!-- Error Message -->
            <div v-if="error" class="bg-[hsl(var(--destructive-light))] border border-[hsl(var(--destructive)/0.3)] rounded-xl p-4 animate-fade-in">
              <div class="flex items-center gap-3 text-[hsl(var(--destructive))]">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 flex-shrink-0" />
                <span class="text-sm font-medium">{{ error }}</span>
              </div>
            </div>

            <!-- Loading State -->
            <div v-if="isLoading" class="py-12 flex flex-col items-center justify-center space-y-4 animate-pulse">
              <div class="relative">
                <UIcon name="i-heroicons-cpu-chip" class="w-16 h-16 text-[hsl(var(--primary)/0.2)]" />
                <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-[hsl(var(--primary))] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
              </div>
              <div class="text-center">
                <p class="font-medium text-lg">Elaborazione in corso...</p>
                <p class="text-sm text-[hsl(var(--muted-foreground))]">Analisi semantica e calcolo prezzi</p>
              </div>
            </div>

            <!-- Results -->
            <transition
              enter-active-class="transition ease-out duration-300"
              enter-from-class="opacity-0 translate-y-4"
              enter-to-class="opacity-100 translate-y-0"
            >
              <div v-if="result && !isLoading" class="space-y-6">
                
                <!-- Main Estimate Card -->
                 <div class="grid md:grid-cols-3 gap-6">
                    <!-- Price -->
                    <div v-if="displayEstimate" class="md:col-span-2 bg-gradient-to-br from-[hsl(var(--primary)/0.05)] to-[hsl(var(--primary)/0.1)] rounded-xl border border-[hsl(var(--primary)/0.2)] p-6 shadow-sm relative overflow-hidden group">
                      <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <UIcon name="i-heroicons-currency-euro" class="w-24 h-24 text-[hsl(var(--primary))]" />
                      </div>
                      
                      <div class="relative z-10">
                         <h3 class="text-sm font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">Prezzo Stimato</h3>
                         <div class="flex items-baseline gap-2 mb-4">
                           <span class="text-4xl sm:text-5xl font-bold text-[hsl(var(--foreground))] tracking-tight">
                             {{ formatCurrency(displayEstimate.value) }}
                           </span>
                           <span class="text-xl text-[hsl(var(--muted-foreground))]">
                             / {{ displayEstimate.unit }}
                           </span>
                         </div>
                         
                         <div class="flex items-center gap-4 text-sm flex-wrap">
                            <div class="px-3 py-1 bg-white/50 dark:bg-black/20 rounded-lg border border-[hsl(var(--primary)/0.1)] backdrop-blur-sm">
                               <span class="text-[hsl(var(--muted-foreground))] mr-2">Range:</span>
                               <span class="font-mono font-medium text-[hsl(var(--foreground))]">
                                 {{ formatCurrency(displayEstimate.range_low) }} - {{ formatCurrency(displayEstimate.range_high) }}
                               </span>
                            </div>
                            <div class="flex items-center gap-1.5 text-[hsl(var(--primary))] font-medium">
                               <UIcon name="i-heroicons-check-badge" class="w-4 h-4" />
                               {{ formatConfidence(displayEstimate.confidence) }} Confidenza
                            </div>
                            <div v-if="totalItemsCount" class="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] font-medium">
                              <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
                              {{ selectedItemsCount }} / {{ totalItemsCount }} selezionate
                            </div>
                         </div>
                      </div>
                    </div>

                    <!-- Extracted Properties Summary -->
                    <div v-if="Object.keys(result.extracted_properties).length > 0" class="md:col-span-1 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-5 shadow-sm flex flex-col">
                       <h3 class="text-sm font-semibold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
                        <UIcon name="i-heroicons-swatch" class="w-4 h-4 text-[hsl(var(--primary))]" />
                        Parametri Rilevati
                      </h3>
                      <div class="flex flex-col gap-2 flex-1">
                        <div
                          v-for="(prop, key) in result.extracted_properties"
                          :key="key"
                          class="flex items-start justify-between text-sm p-2 rounded bg-[hsl(var(--muted)/0.3)]"
                        >
                          <span class="text-[hsl(var(--muted-foreground))] capitalize">{{ key }}</span>
                          <span class="font-medium text-[hsl(var(--foreground))] text-right">{{ prop.value }}</span>
                        </div>
                      </div>
                    </div>
                 </div>

                <!-- Similar Items -->
                <div v-if="result.similar_items.length > 0" class="space-y-4">
                  <div class="flex items-center justify-between px-1">
                    <h3 class="text-lg font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
                      <UIcon name="i-heroicons-list-bullet" class="w-5 h-5 text-[hsl(var(--primary))]" />
                      Voci di Riferimento Analizzate
                    </h3>
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-mono px-2 py-1 bg-[hsl(var(--muted))] rounded text-[hsl(var(--muted-foreground))]">
                        {{ selectedItemsCount }} selezionate
                      </span>
                      <span class="text-xs font-mono px-2 py-1 bg-[hsl(var(--muted)/0.6)] rounded text-[hsl(var(--muted-foreground))]">
                        {{ totalItemsCount }} totali
                      </span>
                    </div>
                  </div>
                  
                  <div class="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-sm overflow-hidden">
                    <DataGrid
                      :config="similarItemsGridConfig"
                      :row-data="similarItems as any[]"
                      :loading="isLoading"
                      height="480px"
                      :show-toolbar="false"
                      :enable-row-selection="true"
                      selection-mode="multiple"
                      get-row-id="id"
                      row-clickable
                      row-aria-label="Seleziona voce"
                      :flat="true"
                      empty-state-title="Nessuna voce disponibile"
                      empty-state-message="Nessuna voce simile trovata per il calcolo."
                      @grid-ready="onGridReady"
                      @row-dblclick="(row: any) => openSimilarItem(row as SimilarItem)"
                      @selection-changed="onSelectionChanged"
                    />
                  </div>
                </div>

                <!-- No Selection -->
                <div v-else-if="selectionEmpty" class="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 text-center shadow-sm">
                  <div class="w-16 h-16 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center mx-auto mb-4">
                     <UIcon name="i-heroicons-check-circle" class="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <p class="text-lg font-medium text-[hsl(var(--foreground))]">Seleziona almeno una voce</p>
                  <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-sm mx-auto">
                    La stima del prezzo si aggiorna in base alle voci selezionate.
                  </p>
                </div>

                <!-- No Results -->
                <div v-else-if="!similarItems.length" class="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 text-center shadow-sm">
                  <div class="w-16 h-16 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center mx-auto mb-4">
                     <UIcon name="i-heroicons-magnifying-glass" class="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <p class="text-lg font-medium text-[hsl(var(--foreground))]">Nessuna voce simile trovata</p>
                  <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-sm mx-auto">
                    Prova a semplificare la descrizione oppure abbassa la soglia di similarità nelle opzioni.
                  </p>
                </div>
              </div>
            </transition>

          </div>
        </div>
      </template>
    </MainPage>
  </div>
</template>

<script setup lang="ts">
import MainPage from '~/components/layout/MainPage.vue'
import PageHeader from '~/components/layout/PageHeader.vue'
import DataGrid from '~/components/data-grid/DataGrid.vue'
import PriceEstimatorDetailModule from '~/components/sidebar/modules/PriceEstimatorDetailModule.vue'
import { usePageSidebarModule, useSidebarModules } from '~/composables/useSidebarModules'
import { usePriceEstimatorGridConfig } from '~/composables/usePriceEstimatorGridConfig'
import { useActionsStore } from '~/stores/actions'
import type { Action } from '~/types/actions'
import type { SimilarItem } from '~/composables/usePriceEstimator'
import type { GridApi, GridReadyEvent } from 'ag-grid-community'

const {
  query,
  isLoading,
  result,
  error,
  topK,
  minSimilarity,
  selectedUnit,
  estimate,
  reset,
  formatCurrency,
  formatConfidence,
} = usePriceEstimator()

const actionsStore = useActionsStore()
const actionOwner = 'page:price-estimator'

const registerAction = (action: Action) => {
  actionsStore.registerAction(action, { owner: actionOwner, overwrite: true })
}

const showAdvanced = ref(false)
const selectedSimilarItem = ref<SimilarItem | null>(null)
const { setActiveModule, showSidebar, activeModuleId } = useSidebarModules()
const gridApiRef = ref<GridApi | null>(null)
const selectedItems = ref<SimilarItem[]>([])
const pendingSelectAll = ref(false)

const similarItems = computed(() => result.value?.similar_items ?? [])
const selectedItemsCount = computed(() => selectedItems.value.length)
const totalItemsCount = computed(() => similarItems.value.length)
const selectionEmpty = computed(() =>
  totalItemsCount.value > 0 && selectedItemsCount.value === 0 && !pendingSelectAll.value
)

const { gridConfig: similarItemsGridConfigBase } = usePriceEstimatorGridConfig(similarItems)
const similarItemsGridConfig = computed(() => ({
  ...similarItemsGridConfigBase,
  rowClassRules: {
    ...(similarItemsGridConfigBase.rowClassRules || {}),
    'ag-row-detail-active': (params: any) => selectedSimilarItem.value?.id === params.data?.id,
  },
}))

const selectAllRows = () => {
  if (!gridApiRef.value) return
  gridApiRef.value.selectAll()
  selectedItems.value = gridApiRef.value.getSelectedRows() as SimilarItem[]
}

usePageSidebarModule({
  id: 'price-estimator-detail',
  label: 'Dettaglio',
  icon: 'heroicons:document-text',
  order: 0,
  component: PriceEstimatorDetailModule,
  props: {
    item: selectedSimilarItem,
    onClose: () => {
      selectedSimilarItem.value = null
    },
  },
})

onMounted(() => {
  registerAction({
    id: 'priceEstimator.estimate',
    label: 'Stima prezzo',
    description: 'Esegue la stima prezzo',
    category: 'Price Estimator',
    scope: 'global',
    icon: 'i-heroicons-sparkles',
    keywords: ['stima', 'prezzo'],
    isEnabled: () => Boolean(query.value && query.value.length >= 3),
    disabledReason: 'Inserisci una descrizione di almeno 3 caratteri',
    handler: () => estimate(),
  })

  registerAction({
    id: 'priceEstimator.reset',
    label: 'Nuova ricerca',
    description: 'Resetta la ricerca corrente',
    category: 'Price Estimator',
    scope: 'global',
    icon: 'i-heroicons-arrow-path',
    keywords: ['reset', 'ricerca'],
    isEnabled: () => Boolean(result.value),
    disabledReason: 'Nessun risultato da resettare',
    handler: () => reset(),
  })

  registerAction({
    id: 'priceEstimator.toggleAdvanced',
    label: 'Opzioni avanzate',
    description: 'Mostra o nasconde le opzioni avanzate',
    category: 'Price Estimator',
    scope: 'global',
    icon: 'i-heroicons-adjustments-horizontal',
    keywords: ['opzioni', 'avanzate'],
    handler: () => {
      showAdvanced.value = !showAdvanced.value
    },
  })
})

onUnmounted(() => {
  actionsStore.unregisterOwner(actionOwner)
})

const buildPercentile = (values: number[], percentile: number) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = (sorted.length - 1) * percentile
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sorted[lower] ?? 0
  const weight = idx - lower
  return (sorted[lower] ?? 0) * (1 - weight) + (sorted[upper] ?? 0) * weight
}

const buildEstimateFromItems = (items: SimilarItem[], targetUnit: string | null) => {
  if (!items.length) return null
  let validItems = items.filter((item) => (item.combined_score ?? 0) >= 0 && item.price > 0)
  if (!validItems.length) {
    validItems = items.filter((item) => item.price > 0)
  }
  if (!validItems.length) return null

  const unitCounts = new Map<string, number>()
  validItems.forEach((item) => {
    if (!item.unit) return
    unitCounts.set(item.unit, (unitCounts.get(item.unit) ?? 0) + 1)
  })
  if (!unitCounts.size) return null

  const availableUnits = Object.fromEntries(unitCounts.entries())
  const target = targetUnit && availableUnits[targetUnit] ? targetUnit : null
  const unit = target ?? Array.from(unitCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]
  if (!unit) return null

  const unitItems = validItems.filter((item) => item.unit === unit)
  if (!unitItems.length) return null

  const prices = unitItems.map((item) => item.price)
  const weights = unitItems.map((item) => Math.max(item.combined_score ?? 0, 0.1))
  const totalWeight = weights.reduce((sum, value) => sum + value, 0)
  const estimated = totalWeight > 0
    ? prices.reduce((sum, price, index) => sum + price * weights[index], 0) / totalWeight
    : buildPercentile(prices, 0.5)

  const rangeLow = prices.length > 1 ? buildPercentile(prices, 0.25) : prices[0]
  const rangeHigh = prices.length > 1 ? buildPercentile(prices, 0.75) : prices[0]

  let confidence = 0.5
  if (prices.length >= 3) {
    const avg = prices.reduce((sum, value) => sum + value, 0) / prices.length
    const variance = prices.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / prices.length
    const cv = avg > 0 ? Math.sqrt(variance) / avg : 1
    confidence = Math.max(0.3, Math.min(0.95, 1 - cv))
  }

  return {
    value: Number(estimated.toFixed(2)),
    range_low: Number(rangeLow.toFixed(2)),
    range_high: Number(rangeHigh.toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
    unit,
    available_units: availableUnits,
    method: 'selection',
  }
}

const estimateItems = computed(() => {
  if (selectedItems.value.length) return selectedItems.value
  if (pendingSelectAll.value) return similarItems.value
  return []
})

const selectionEstimate = computed(() => buildEstimateFromItems(estimateItems.value, selectedUnit.value))
const displayEstimate = computed(() => selectionEstimate.value)

const unitOptionsSource = computed(() =>
  selectedItems.value.length ? selectedItems.value : similarItems.value
)

const unitOptions = computed(() => {
  const counts = new Map<string, number>()
  unitOptionsSource.value.forEach((item) => {
    if (!item.unit) return
    counts.set(item.unit, (counts.get(item.unit) ?? 0) + 1)
  })

  return Array.from(counts.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([unit, count]) => ({
      label: `${unit} (${count} voci)`,
      value: unit,
    }))
})

// Auto-select unit when result comes in (if not already selected)
watch(() => result.value, (newResult) => {
  if (newResult?.estimated_price?.unit && !selectedUnit.value) {
    selectedUnit.value = newResult.estimated_price.unit
  }
  selectedSimilarItem.value = null
  selectedItems.value = []
  pendingSelectAll.value = Boolean(newResult?.similar_items?.length)
  if (gridApiRef.value && newResult?.similar_items?.length) {
    nextTick(() => {
      selectAllRows()
      pendingSelectAll.value = false
    })
  } else if (gridApiRef.value && !newResult?.similar_items?.length) {
    gridApiRef.value.deselectAll()
    pendingSelectAll.value = false
  }
})

const openSimilarItem = (item: SimilarItem) => {
  selectedSimilarItem.value = item
  if (activeModuleId.value !== 'price-estimator-detail') {
    setActiveModule('price-estimator-detail')
  }
  showSidebar()
}

const onGridReady = (params: GridReadyEvent) => {
  gridApiRef.value = params.api
  if (pendingSelectAll.value) {
    nextTick(() => {
      selectAllRows()
      pendingSelectAll.value = false
    })
  }
}

const onSelectionChanged = (rows: SimilarItem[]) => {
  selectedItems.value = rows
}

</script>
