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
                    <div v-if="result.estimated_price" class="md:col-span-2 bg-gradient-to-br from-[hsl(var(--primary)/0.05)] to-[hsl(var(--primary)/0.1)] rounded-xl border border-[hsl(var(--primary)/0.2)] p-6 shadow-sm relative overflow-hidden group">
                      <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <UIcon name="i-heroicons-currency-euro" class="w-24 h-24 text-[hsl(var(--primary))]" />
                      </div>
                      
                      <div class="relative z-10">
                         <h3 class="text-sm font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">Prezzo Stimato</h3>
                         <div class="flex items-baseline gap-2 mb-4">
                           <span class="text-4xl sm:text-5xl font-bold text-[hsl(var(--foreground))] tracking-tight">
                             {{ formatCurrency(result.estimated_price.value) }}
                           </span>
                           <span class="text-xl text-[hsl(var(--muted-foreground))]">
                             / {{ result.estimated_price.unit }}
                           </span>
                         </div>
                         
                         <div class="flex items-center gap-4 text-sm">
                            <div class="px-3 py-1 bg-white/50 dark:bg-black/20 rounded-lg border border-[hsl(var(--primary)/0.1)] backdrop-blur-sm">
                               <span class="text-[hsl(var(--muted-foreground))] mr-2">Range:</span>
                               <span class="font-mono font-medium text-[hsl(var(--foreground))]">
                                 {{ formatCurrency(result.estimated_price.range_low) }} - {{ formatCurrency(result.estimated_price.range_high) }}
                               </span>
                            </div>
                            <div class="flex items-center gap-1.5 text-[hsl(var(--primary))] font-medium">
                               <UIcon name="i-heroicons-check-badge" class="w-4 h-4" />
                               {{ formatConfidence(result.estimated_price.confidence) }} Confidenza
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
                    <span class="text-xs font-mono px-2 py-1 bg-[hsl(var(--muted))] rounded text-[hsl(var(--muted-foreground))]">
                      {{ result.similar_items.length }} voci
                    </span>
                  </div>
                  
                  <div class="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-sm overflow-hidden">
                    <div class="divide-y divide-[hsl(var(--border))]">
                      <div
                        v-for="item in result.similar_items"
                        :key="item.id"
                        class="p-4 sm:p-5 hover:bg-[hsl(var(--muted)/0.3)] transition-colors group cursor-default"
                      >
                        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div class="flex-1 min-w-0">
                            <div class="flex flex-wrap items-center gap-2 mb-2">
                              <span class="font-mono text-xs px-1.5 py-0.5 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded border border-[hsl(var(--primary)/0.2)]">
                                {{ item.code }}
                              </span>
                              <span class="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                                <UIcon name="i-heroicons-folder" class="w-3 h-3" />
                                {{ item.project_name }}
                              </span>
                            </div>
                            <p class="text-sm text-[hsl(var(--foreground))] leading-relaxed">
                              {{ item.description }}
                            </p>
                            
                            <!-- Detailed Matches -->
                            <div v-if="item.property_matches.length > 0" class="flex flex-wrap gap-2 mt-3">
                              <span
                                v-for="match in item.property_matches.slice(0, 6)"
                                :key="match.name"
                                :class="[
                                  'text-[10px] px-2 py-1 rounded-full border transition-colors',
                                  match.is_match 
                                    ? 'bg-[hsl(var(--success-light))] border-[hsl(var(--success)/0.3)] text-[hsl(var(--success))]' 
                                    : 'bg-[hsl(var(--muted)/0.3)] border-transparent text-[hsl(var(--muted-foreground))]'
                                ]"
                              >
                                {{ match.name }}: <span class="font-medium">{{ match.item_value || 'N/D' }}</span>
                              </span>
                            </div>
                          </div>
                          
                          <div class="text-left sm:text-right flex-shrink-0 pt-2 sm:pt-0 pl-0 sm:pl-4 border-t sm:border-t-0 border-[hsl(var(--border))] sm:border-l border-dashed mt-2 sm:mt-0">
                            <div class="flex items-baseline sms:justify-end gap-1.5">
                               <span class="text-lg font-bold text-[hsl(var(--foreground))]">
                                  {{ formatCurrency(item.price) }}
                               </span>
                               <span class="text-xs text-[hsl(var(--muted-foreground))]">/ {{ item.unit }}</span>
                            </div>
                            <div class="mt-1 flex items-center sm:justify-end gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                              <span>Score:</span>
                              <span class="font-mono font-medium" :class="item.combined_score > 0.8 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--warning))]'">
                                {{ Math.round(item.combined_score * 100) }}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- No Results -->
                <div v-else-if="!result.estimated_price" class="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 text-center shadow-sm">
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
import { useActionsStore } from '~/stores/actions'
import type { Action } from '~/types/actions'

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

// Valid units options derived from result
const unitOptions = computed(() => {
  if (!result.value?.estimated_price?.available_units) return []
  
  return Object.entries(result.value.estimated_price.available_units)
    .sort(([, a], [, b]) => b - a) // Sort by count desc
    .map(([unit, count]) => ({
      label: `${unit} (${count} voci)`,
      value: unit
    }))
})

// Auto-select unit when result comes in (if not already selected)
watch(() => result.value, (newResult) => {
  if (newResult?.estimated_price?.unit && !selectedUnit.value) {
    selectedUnit.value = newResult.estimated_price.unit
  }
})

</script>
