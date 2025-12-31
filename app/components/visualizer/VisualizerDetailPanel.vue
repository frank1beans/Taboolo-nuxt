<script setup lang="ts">
import type { Point } from '~/composables/useSemanticMap'

type Neighbor = Point & { distance: number; clusterId?: number }

defineProps<{
  isOpen: boolean
  selectedPoint: Point | null
  currentNeighbors: Neighbor[]
  mode: '2d' | '3d'
  getClusterColor: (clusterId: number) => string
  formatCurrency: (value: number) => string
  onCopyId: (id: string) => void
  onNavigateNeighbor: (id: string) => void
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <transition 
    enter-active-class="transform transition ease-out duration-300" 
    enter-from-class="translate-x-full" 
    enter-to-class="translate-x-0"
    leave-active-class="transform transition ease-in duration-200" 
    leave-from-class="translate-x-0" 
    leave-to-class="translate-x-full"
  >
    <div v-if="isOpen && selectedPoint" class="absolute top-0 right-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 z-50 flex flex-col">
      
      <!-- Header -->
      <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/80 dark:bg-gray-800/50">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-3 h-3 rounded-full flex-shrink-0" :style="{ backgroundColor: getClusterColor(selectedPoint.cluster) }"/>
          <span class="font-bold text-sm truncate">Cluster {{ selectedPoint.cluster }}</span>
        </div>
        <div class="flex items-center gap-1">
          <!-- Copy ID Button -->
          <UTooltip :text="selectedPoint.id">
            <UButton 
              icon="i-heroicons-clipboard-document" 
              size="xs" 
              variant="ghost" 
              color="neutral"
              @click="onCopyId(selectedPoint.id)"
            />
          </UTooltip>
          <UButton 
            icon="i-heroicons-x-mark" 
            size="xs" 
            variant="ghost" 
            color="neutral"
            @click="emit('close')"
          />
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        
        <!-- Description -->
        <div>
          <p class="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            {{ selectedPoint.label }}
          </p>
        </div>

        <!-- Key Info Cards -->
        <div class="grid grid-cols-2 gap-2">
          <div v-if="selectedPoint.price" class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
            <span class="text-[10px] text-green-600 dark:text-green-400 uppercase font-bold block mb-1">Prezzo</span>
            <span class="text-lg font-bold text-green-700 dark:text-green-300">{{ formatCurrency(selectedPoint.price) }}</span>
          </div>
          <div v-if="selectedPoint.unit" class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <span class="text-[10px] text-gray-500 uppercase font-bold block mb-1">Unità</span>
            <span class="text-lg font-bold text-gray-700 dark:text-gray-300">{{ selectedPoint.unit }}</span>
          </div>
        </div>

        <!-- Nearest Neighbors -->
        <div v-if="currentNeighbors.length > 0">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-[10px] font-bold uppercase text-gray-400">Articoli simili</h4>
            <span class="text-[10px] text-gray-400">distanza embedding</span>
          </div>
          <div class="space-y-1.5">
            <button 
              v-for="neighbor in currentNeighbors" 
              :key="neighbor.id"
              class="w-full text-left p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors group"
              @click="onNavigateNeighbor(neighbor.id)"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: getClusterColor(neighbor.clusterId ?? neighbor.cluster) }"/>
                  <span class="text-[10px] font-mono text-gray-400">{{ neighbor.id.slice(-6) }}</span>
                </span>
                <span class="text-[10px] text-gray-400">{{ neighbor.distance.toFixed(3) }}</span>
              </div>
              <p class="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 group-hover:text-primary-600">{{ neighbor.label }}</p>
              <span v-if="neighbor.amount" class="text-[10px] text-green-600 mt-1 block">{{ formatCurrency(neighbor.amount) }}</span>
            </button>
          </div>
        </div>

        <!-- Technical Details (Collapsible) -->
        <details class="text-xs">
          <summary class="text-gray-400 cursor-pointer hover:text-gray-600">Dettagli tecnici</summary>
          <div class="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded font-mono text-[10px] text-gray-500 space-y-1">
            <div>ID: {{ selectedPoint.id }}</div>
            <div>Coord: [{{ selectedPoint.x?.toFixed(4) }}, {{ selectedPoint.y?.toFixed(4) }}{{ mode === '3d' ? `, ${selectedPoint.z?.toFixed(4)}` : '' }}]</div>
          </div>
        </details>
      </div>
    </div>
  </transition>
</template>
