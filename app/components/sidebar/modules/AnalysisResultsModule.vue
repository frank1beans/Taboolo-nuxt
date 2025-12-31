<script setup lang="ts">
import { computed, ref } from 'vue'

interface AnalysisParams {
  topK: number
  minSimilarity: number
  madThreshold: number
}

interface CategoryStats {
  mean: number
  median: number
  mad: number
  min: number
  max: number
  std: number
}

interface Category {
  wbs6_code: string
  wbs6_description: string
  item_count: number
  outlier_count: number
  stats?: CategoryStats
}

interface AnalysisResult {
  total_items: number
  categories_analyzed: number
  outliers_found: number
  categories: Category[]
}

const props = defineProps<{
  analysisParams: AnalysisParams
  analysisResult: AnalysisResult | null
  analysisLoading: boolean
  analysisError: string | null
}>()

const emit = defineEmits<{
  updateAnalysisParam: [key: keyof AnalysisParams, value: number]
  runAnalysis: []
  toggleVisibility: [type: 'project' | 'wbs06' | 'cluster', id: string | number]
}>()

const showAllCategories = ref(false)

const outlierPercent = computed(() => {
  if (!props.analysisResult) return '0'
  const pct = (props.analysisResult.outliers_found / props.analysisResult.total_items) * 100
  return pct.toFixed(1)
})

const displayedCategories = computed(() => {
  const cats = props.analysisResult?.categories ?? []
  return showAllCategories.value ? cats : cats.slice(0, 5)
})
</script>

<template>
  <SidebarModule title="Analisi" subtitle="Prezzi" icon="heroicons:chart-bar">
    <div class="space-y-4">
      <div class="space-y-3">
        <h3 class="panel-section-header">Parametri</h3>

        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Top K Neighbors</label>
            <span class="value-badge">{{ analysisParams.topK }}</span>
          </div>
          <input
            type="range"
            :value="analysisParams.topK"
            min="10"
            max="50"
            step="5"
            class="slider-theme"
            @input="emit('updateAnalysisParam', 'topK', Number(($event.target as HTMLInputElement).value))"
          >
        </div>

        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Min Similarity</label>
            <span class="value-badge">{{ analysisParams.minSimilarity.toFixed(2) }}</span>
          </div>
          <input
            type="range"
            :value="analysisParams.minSimilarity"
            min="0.3"
            max="0.9"
            step="0.05"
            class="slider-theme"
            @input="emit('updateAnalysisParam', 'minSimilarity', Number(($event.target as HTMLInputElement).value))"
          >
        </div>

        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="text-[10px] text-[hsl(var(--muted-foreground))]">MAD Threshold</label>
            <span class="value-badge">{{ analysisParams.madThreshold }}</span>
          </div>
          <input
            type="range"
            :value="analysisParams.madThreshold"
            min="1"
            max="4"
            step="0.5"
            class="slider-theme"
            @input="emit('updateAnalysisParam', 'madThreshold', Number(($event.target as HTMLInputElement).value))"
          >
        </div>

        <UButton
          block
          icon="i-heroicons-play"
          color="primary"
          class="mt-4"
          :loading="analysisLoading"
          @click="emit('runAnalysis')"
        >
          Esegui Analisi Prezzi
        </UButton>

        <div v-if="analysisError" class="text-xs text-red-500 mt-2 bg-red-50 p-2 rounded">
          {{ analysisError }}
        </div>
      </div>

      <div v-if="analysisResult" class="mt-6 border-t border-[hsl(var(--border))] pt-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="panel-section-header">Risultati</h3>
          <UBadge :color="analysisResult.outliers_found > 0 ? 'error' : 'success'" size="xs" variant="soft">
            {{ analysisResult.outliers_found }} anomalie ({{ outlierPercent }}%)
          </UBadge>
        </div>

        <div class="text-[10px] text-[hsl(var(--muted-foreground))] mb-3 grid grid-cols-2 gap-2">
          <div class="bg-[hsl(var(--muted)/0.3)] p-1.5 rounded">
            <span class="block font-mono text-[hsl(var(--foreground))]">{{ analysisResult.total_items }}</span>
            <span>Elementi totali</span>
          </div>
          <div class="bg-[hsl(var(--muted)/0.3)] p-1.5 rounded">
            <span class="block font-mono text-[hsl(var(--foreground))]">{{ analysisResult.categories_analyzed }}</span>
            <span>Gruppi analizzati</span>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between panel-section-header">
            <span>Gruppi con anomalie</span>
              <UButton
                :color="true ? 'success' : 'error'"
                variant="link"
                size="xs"
                @click="showAllCategories = !showAllCategories"
              >
                {{ showAllCategories ? 'Vedi meno' : 'Vedi tutti' }}
              </UButton>
          </div>

          <div v-for="cat in displayedCategories" :key="cat.wbs6_code" class="bg-[hsl(var(--muted)/0.2)] rounded p-2 text-xs">
            <div class="flex justify-between items-start mb-1">
              <span class="font-medium truncate flex-1 mr-2" :title="cat.wbs6_description">{{ cat.wbs6_description || cat.wbs6_code }}</span>
              <span class="text-red-500 font-mono font-bold">{{ cat.outlier_count }}</span>
            </div>
            <div class="text-[10px] text-[hsl(var(--muted-foreground))] flex justify-between">
              <span>{{ cat.item_count }} elementi</span>
              <UButton
                variant="link"
                color="neutral"
                @click="emit('toggleVisibility', 'wbs06', cat.wbs6_code)"
              >
                Mostra
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </SidebarModule>
</template>
