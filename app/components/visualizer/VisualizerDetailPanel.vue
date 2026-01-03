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
    <div v-if="isOpen && selectedPoint" class="absolute top-0 right-0 h-full w-80 bg-[hsl(var(--card))] shadow-2xl border-l border-[hsl(var(--border))] z-50 flex flex-col">
      
      <!-- Header -->
      <div class="px-4 py-3 border-b border-[hsl(var(--border))] flex justify-between items-center bg-[hsl(var(--secondary)/0.8)]">
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
          <p class="text-sm text-[hsl(var(--foreground))] leading-relaxed">
            {{ selectedPoint.label }}
          </p>
        </div>

        <!-- Key Info Cards -->
        <div class="grid grid-cols-2 gap-2">
          <div v-if="selectedPoint.price" class="p-3 bg-[hsl(var(--success-light))] rounded-lg border border-[hsl(var(--success)/0.3)]">
            <span class="text-micro text-[hsl(var(--success))] uppercase font-bold block mb-1">Prezzo</span>
            <span class="text-lg font-bold text-[hsl(var(--success))]">{{ formatCurrency(selectedPoint.price) }}</span>
          </div>
          <div v-if="selectedPoint.unit" class="p-3 bg-[hsl(var(--secondary))] rounded-lg border border-[hsl(var(--border))]">
            <span class="text-micro text-[hsl(var(--muted-foreground))] uppercase font-bold block mb-1">Unità</span>
            <span class="text-lg font-bold text-[hsl(var(--foreground))]">{{ selectedPoint.unit }}</span>
          </div>
        </div>

        <!-- Nearest Neighbors -->
        <div v-if="currentNeighbors.length > 0">
          <div class="flex items-center justify-between mb-2">
            <h4 class="panel-section-header">Articoli simili</h4>
            <span class="text-micro text-[hsl(var(--muted-foreground))]">distanza embedding</span>
          </div>
          <div class="space-y-1.5">
            <button 
              v-for="neighbor in currentNeighbors" 
              :key="neighbor.id"
              class="w-full text-left p-2 bg-[hsl(var(--secondary))] rounded-lg border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] transition-colors group"
              @click="onNavigateNeighbor(neighbor.id)"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: getClusterColor(neighbor.clusterId ?? neighbor.cluster) }"/>
                  <span class="text-micro font-mono text-[hsl(var(--muted-foreground))]">{{ neighbor.id.slice(-6) }}</span>
                </span>
                <span class="text-micro text-[hsl(var(--muted-foreground))]">{{ neighbor.distance.toFixed(3) }}</span>
              </div>
              <p class="text-xs text-[hsl(var(--foreground))] line-clamp-2 group-hover:text-[hsl(var(--primary))]">{{ neighbor.label }}</p>
              <span v-if="neighbor.amount" class="text-micro text-[hsl(var(--success))] mt-1 block">{{ formatCurrency(neighbor.amount) }}</span>
            </button>
          </div>
        </div>

        <!-- Technical Details (Collapsible) -->
        <details class="text-xs">
          <summary class="text-[hsl(var(--muted-foreground))] cursor-pointer hover:text-[hsl(var(--foreground))]">Dettagli tecnici</summary>
          <div class="mt-2 p-2 bg-[hsl(var(--secondary))] rounded font-mono text-micro text-[hsl(var(--muted-foreground))] space-y-1">
            <div>ID: {{ selectedPoint.id }}</div>
            <div>Coord: [{{ selectedPoint.x?.toFixed(4) }}, {{ selectedPoint.y?.toFixed(4) }}{{ mode === '3d' ? `, ${selectedPoint.z?.toFixed(4)}` : '' }}]</div>
          </div>
        </details>
      </div>
    </div>
  </transition>
</template>
