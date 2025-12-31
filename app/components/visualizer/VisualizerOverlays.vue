<script setup lang="ts">
interface SelectionStats {
  count: number
  sumAmount: number | null
  mean: number | null
  median: number | null
  topCategories: { name: string }[]
}

interface HoveredPoint {
  cluster: number
  label: string
  price?: number
}

defineProps<{
  hoveredPoint: HoveredPoint | null
  isLoading: boolean
  selectionStats: SelectionStats | null
  selectedPointCount: number
  mode: '2d' | '3d'
  getClusterColor: (clusterId: number) => string
  formatCurrency: (value: number) => string
  onClearSelection: () => void
}>()
</script>

<template>
  <!-- Hover Status (Top Center) -->
  <div class="absolute top-4 left-4 right-4 z-10 pointer-events-none flex justify-center">
    <transition 
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-show="hoveredPoint || isLoading" class="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-lg rounded-full px-4 py-2 flex items-center gap-3 border border-gray-200 dark:border-gray-700 max-w-xl">
        <template v-if="isLoading">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-primary-500" />
          <span class="text-xs font-medium">Elaborazione...</span>
        </template>
        <template v-else-if="hoveredPoint">
          <div class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: getClusterColor(hoveredPoint.cluster) }"/>
          <span class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ hoveredPoint.label }}</span>
          <span v-if="hoveredPoint.price" class="text-xs text-green-600 dark:text-green-400 font-medium">{{ formatCurrency(hoveredPoint.price) }}</span>
        </template>
      </div>
    </transition>
  </div>

  <!-- Selection Stats (Bottom Left) -->
  <transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div
v-if="selectionStats && selectedPointCount > 0" 
         class="absolute bottom-4 left-4 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-lg rounded-xl p-4 border border-gray-200 dark:border-gray-700 max-w-xs">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-sm text-gray-900 dark:text-white">Selezione</h3>
        <button class="text-gray-400 hover:text-gray-600" @click="onClearSelection()">
          <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
        </button>
      </div>
      <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div><span class="text-gray-500">Punti:</span> <span class="font-bold">{{ selectionStats.count }}</span></div>
        <div v-if="selectionStats.sumAmount !== null"><span class="text-gray-500">Totale:</span> <span class="font-bold text-green-600">{{ formatCurrency(selectionStats.sumAmount) }}</span></div>
        <div v-if="selectionStats.mean !== null"><span class="text-gray-500">Media:</span> <span class="font-bold">{{ formatCurrency(selectionStats.mean) }}</span></div>
        <div v-if="selectionStats.median !== null"><span class="text-gray-500">Mediana:</span> <span class="font-bold">{{ formatCurrency(selectionStats.median) }}</span></div>
      </div>
      <div v-if="selectionStats.topCategories.length > 0" class="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div class="flex flex-wrap gap-1">
          <span
v-for="cat in selectionStats.topCategories.slice(0, 3)" :key="cat.name" 
                class="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            {{ cat.name }}
          </span>
        </div>
      </div>
    </div>
  </transition>

  <!-- Lasso Hint (Bottom Right) -->
  <div v-if="mode === '2d' && !selectedPointCount" class="absolute bottom-4 right-4 z-10">
    <div class="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[10px] text-gray-500 border border-gray-200 dark:border-gray-700">
      <UIcon name="i-heroicons-cursor-arrow-rays" class="inline mr-1" />
      Usa <kbd class="bg-gray-200 dark:bg-gray-700 px-1 rounded">lasso</kbd> dalla toolbar
    </div>
  </div>
</template>
