<script setup lang="ts">
import { computed, unref, type Ref } from 'vue'
interface MapParams {
  n_neighbors: number
  min_dist: number
  metric: string
  min_cluster_size: number
}

type MaybeRef<T> = T | Ref<T>

const props = defineProps<{
  mapParams: MaybeRef<MapParams>
  isLoadingMap: MaybeRef<boolean>
}>()

const emit = defineEmits<{
  'update:mapParams': [params: MapParams]
  recalculateMap: []
}>()

const resolvedParams = computed(() => unref(props.mapParams))
const resolvedLoading = computed(() => Boolean(unref(props.isLoadingMap)))

const updateMapParam = (key: keyof MapParams, value: MapParams[keyof MapParams]) => {
  emit('update:mapParams', { ...resolvedParams.value, [key]: value })
}
</script>

<template>
  <SidebarModule title="UMAP" subtitle="Parametri" icon="heroicons:cpu-chip">
    <div class="space-y-4">
      <div class="space-y-2">
        <h3 class="panel-section-header">Parametri Mappa</h3>

        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Neighbors</label>
            <span class="value-badge">{{ resolvedParams.n_neighbors }}</span>
          </div>
          <input
            type="range"
            :value="resolvedParams.n_neighbors"
            min="5"
            max="100"
            step="1"
            class="slider-theme"
            @input="updateMapParam('n_neighbors', Number(($event.target as HTMLInputElement).value))"
          >
        </div>

        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Min Dist</label>
            <span class="value-badge">{{ resolvedParams.min_dist.toFixed(2) }}</span>
          </div>
          <input
            type="range"
            :value="resolvedParams.min_dist"
            min="0.0"
            max="1.0"
            step="0.05"
            class="slider-theme"
            @input="updateMapParam('min_dist', Number(($event.target as HTMLInputElement).value))"
          >
        </div>

        <div class="space-y-1">
          <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Metrica</label>
          <div class="flex gap-2">
            <button
              v-for="m in ['cosine', 'euclidean']"
              :key="m"
              class="flex-1 px-2 py-1 text-xs rounded border transition-colors"
              :class="resolvedParams.metric === m
                ? 'bg-[hsl(var(--primary))] text-white border-transparent'
                : 'bg-transparent border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'"
              @click="updateMapParam('metric', m)"
            >
              {{ m }}
            </button>
          </div>
        </div>

        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Min Cluster Size</label>
            <span class="value-badge">{{ resolvedParams.min_cluster_size }}</span>
          </div>
          <input
            type="range"
            :value="resolvedParams.min_cluster_size"
            min="3"
            max="50"
            step="1"
            class="slider-theme"
            @input="updateMapParam('min_cluster_size', Number(($event.target as HTMLInputElement).value))"
          >
        </div>

        <UButton
          block
          color="primary"
          :loading="resolvedLoading"
          icon="i-heroicons-cpu-chip"
          @click="emit('recalculateMap')"
        >
          Ricalcola Mappa
        </UButton>
      </div>
    </div>
  </SidebarModule>
</template>
