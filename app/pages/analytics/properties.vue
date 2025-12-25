<template>
  <div class="absolute inset-0 flex overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
    <div
      class="flex-shrink-0 flex flex-col m-4 mr-0 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm overflow-hidden relative"
      :style="{ width: sidebarWidth + 'px' }"
    >
      <div class="p-4 border-b border-[hsl(var(--border))]">
        <h2 class="font-bold text-base mb-0.5">Analytics Proprieta</h2>
        <p class="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
          {{ propertyPoints.length.toLocaleString() }} punti con proprieta
          <span v-if="analytics.mapData.value?.projects.length">
            - {{ analytics.mapData.value.projects.length }} progetti
          </span>
        </p>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto">
        <div class="p-3 border-b border-[hsl(var(--border))] space-y-3">
          <h3 class="font-bold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Filtri</h3>

        <div>
          <label class="text-[10px] text-[hsl(var(--muted-foreground))] block mb-1">Progetti</label>
          <USelectMenu
            v-model="selectedProjects"
            :items="projectOptions"
            value-key="value"
            multiple
            placeholder="Tutti i progetti"
            class="w-full"
          />
        </div>

        <div>
          <label class="text-[10px] text-[hsl(var(--muted-foreground))] block mb-1">Anno</label>
          <USelectMenu
            v-model="selectedYear"
            :items="yearOptions"
            value-key="value"
            placeholder="Tutti gli anni"
            class="w-full"
          />
        </div>

        <div>
          <label class="text-[10px] text-[hsl(var(--muted-foreground))] block mb-1">Business Unit</label>
          <USelectMenu
            v-model="selectedBU"
            :items="buOptions"
            value-key="value"
            placeholder="Tutte le BU"
            class="w-full"
          />
        </div>

        <UButton
          block
          variant="soft"
          color="primary"
          @click="analytics.fetchMapData"
          :loading="analytics.isLoadingMap.value"
          icon="i-heroicons-funnel"
          size="sm"
        >
          Applica Filtri
        </UButton>
        </div>

        <div class="p-3 border-b border-[hsl(var(--border))] space-y-3">
          <h3 class="font-bold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Estrazione proprieta</h3>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] text-[hsl(var(--muted-foreground))] block mb-1">Max voci</label>
              <UInput v-model.number="propertyMaxItems" type="number" min="1" class="w-full" />
            </div>
            <div>
              <label class="text-[10px] text-[hsl(var(--muted-foreground))] block mb-1">Pausa (s)</label>
              <UInput v-model.number="propertySleepSeconds" type="number" min="0" step="0.5" class="w-full" />
            </div>
          </div>
          <UButton
            block
            variant="outline"
            color="primary"
            @click="triggerComputeProperties"
            :loading="analytics.isComputingProperties.value"
            icon="i-heroicons-sparkles"
            size="sm"
          >
            Calcola Proprieta
          </UButton>
        </div>

        <div class="p-3 border-b border-[hsl(var(--border))] space-y-3">
          <h3 class="font-bold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Embedding UMAP</h3>
          <USelectMenu
            v-model="embeddingMode"
            :items="embeddingModeOptions"
            value-key="value"
            class="w-full"
          />
          <div v-if="embeddingMode === 'weighted'" class="space-y-2">
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Peso descrizione</label>
                <span class="text-[10px] font-mono bg-[hsl(var(--secondary))] px-1 rounded">{{ baseWeight.toFixed(2) }}</span>
              </div>
              <input
                type="range"
                v-model.number="baseWeight"
                min="0" max="1" step="0.05"
                class="w-full h-1.5 bg-[hsl(var(--secondary))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--primary))]"
              />
            </div>
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Peso proprieta</label>
                <span class="text-[10px] font-mono bg-[hsl(var(--secondary))] px-1 rounded">{{ detailWeight.toFixed(2) }}</span>
              </div>
              <input
                type="range"
                v-model.number="detailWeight"
                min="0" max="1" step="0.05"
                class="w-full h-1.5 bg-[hsl(var(--secondary))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--primary))]"
              />
            </div>
          </div>
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Confidenza minima proprieta</label>
              <span class="text-[10px] font-mono bg-[hsl(var(--secondary))] px-1 rounded">{{ minConfidence.toFixed(2) }}</span>
            </div>
            <input
              type="range"
              v-model.number="minConfidence"
              min="0" max="1" step="0.05"
              class="w-full h-1.5 bg-[hsl(var(--secondary))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--primary))]"
            />
          </div>
          <UButton
            block
            variant="outline"
            color="warning"
            @click="triggerComputeMap"
            :loading="analytics.isComputingMap.value"
            icon="i-heroicons-cpu-chip"
            size="sm"
          >
            Calcola UMAP
          </UButton>
        </div>

        <div class="p-3 border-b border-[hsl(var(--border))] space-y-3">
          <label class="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase mb-1 block">Colora per</label>
          <USelectMenu
            v-model="colorBy"
            :items="colorByOptions"
            value-key="value"
            class="w-full"
          />

        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Dimensione punti</label>
            <span class="text-[10px] font-mono bg-[hsl(var(--secondary))] px-1 rounded">{{ pointSize }}</span>
          </div>
          <input
            type="range"
            v-model.number="pointSize"
            min="2" max="15" step="1"
            class="w-full h-1.5 bg-[hsl(var(--secondary))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--primary))]"
          />
        </div>

        <div class="flex items-center justify-between">
          <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Mostra Poli</label>
          <button
            @click="showPoles = !showPoles"
            :class="['w-10 h-5 rounded-full transition-colors flex items-center px-0.5',
              showPoles ? 'bg-[hsl(var(--primary))] justify-end' : 'bg-[hsl(var(--secondary))] justify-start']"
          >
            <span class="w-4 h-4 rounded-full bg-white shadow"></span>
          </button>
        </div>

        <div class="flex items-center justify-between">
          <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Vista 3D</label>
          <button
            @click="is3D = !is3D"
            :class="['w-10 h-5 rounded-full transition-colors flex items-center px-0.5',
              is3D ? 'bg-[hsl(var(--primary))] justify-end' : 'bg-[hsl(var(--secondary))] justify-start']"
          >
            <span class="w-4 h-4 rounded-full bg-white shadow"></span>
          </button>
        </div>

        <div class="flex items-center justify-between">
          <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Mostra assi</label>
          <button
            @click="showAxes = !showAxes"
            :class="['w-10 h-5 rounded-full transition-colors flex items-center px-0.5',
              showAxes ? 'bg-[hsl(var(--primary))] justify-end' : 'bg-[hsl(var(--secondary))] justify-start']"
          >
            <span class="w-4 h-4 rounded-full bg-white shadow"></span>
          </button>
        </div>
        </div>

        <div class="p-3 border-b border-[hsl(var(--border))] space-y-3">
          <h3 class="font-bold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Filtro proprieta</h3>
          <USelectMenu
            v-model="selectedPropertyKeys"
            :items="propertyKeyOptions"
            value-key="value"
            multiple
            placeholder="Seleziona proprieta"
            class="w-full"
          />
          <div class="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))]">
            <span>Match</span>
            <button
              @click="matchAllProperties = !matchAllProperties"
              class="text-[hsl(var(--primary))] hover:underline"
            >
              {{ matchAllProperties ? 'tutte le proprieta' : 'almeno una' }}
            </button>
          </div>
          <div class="space-y-1 max-h-40 overflow-y-auto">
            <button
              v-for="stat in displayedPropertyKeys"
              :key="stat.key"
              @click="togglePropertyKey(stat.key)"
              class="w-full px-2 py-1.5 rounded flex justify-between items-center text-xs transition-colors hover:bg-[hsl(var(--accent))]"
              :class="propertyKeyActive(stat.key) ? 'text-[hsl(var(--primary))] bg-[hsl(var(--accent))]' : 'text-[hsl(var(--foreground))]'"
            >
              <span class="truncate">{{ stat.key }}</span>
              <span class="text-[10px] opacity-60">{{ stat.count }}</span>
            </button>
          </div>
          <button
            v-if="analytics.propertyKeyStats.value.length > propertyKeyLimit"
            @click="showAllPropertyKeys = !showAllPropertyKeys"
            class="text-[10px] text-[hsl(var(--primary))] hover:underline"
          >
            {{ showAllPropertyKeys ? 'Mostra meno' : `Mostra tutte (${analytics.propertyKeyStats.value.length})` }}
          </button>
        </div>

      <div class="p-3 space-y-2">
        <h4 class="font-bold text-[10px] uppercase text-[hsl(var(--muted-foreground))]">Dettaglio punto</h4>
        <div v-if="selectedPoint" class="space-y-2">
          <div class="p-2 rounded-lg bg-[hsl(var(--secondary))] text-xs">
            <div class="font-mono font-medium text-[hsl(var(--primary))]">{{ selectedPoint.code || selectedPoint.id }}</div>
            <div class="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">{{ selectedPoint.label }}</div>
            <div class="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
              {{ selectedPoint.project_name }} | {{ selectedPoint.wbs06_desc || selectedPoint.wbs06 || 'N/A' }} | Cluster {{ selectedPoint.cluster ?? 'N/A' }}
            </div>
          </div>
          <div class="space-y-2 max-h-60 overflow-y-auto">
            <div
              v-for="entry in selectedPointProperties"
              :key="entry.key"
              class="p-2 rounded-lg bg-[hsl(var(--accent))] text-xs"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-semibold">{{ entry.key }}</span>
                <span class="text-[10px] text-[hsl(var(--muted-foreground))]">{{ formatConfidence(entry.slot.confidence) }}</span>
              </div>
              <div class="text-[11px]">{{ formatPropertyValue(entry.slot.value) }}</div>
              <div v-if="entry.slot.evidence" class="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                {{ formatEvidence(entry.slot.evidence) }}
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-[10px] text-[hsl(var(--muted-foreground))]">
          Seleziona un punto sulla mappa per vedere le proprieta.
        </div>
      </div>
      </div>

      <div
        @mousedown="startResize"
        class="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-[hsl(var(--primary))] transition-colors z-10"
        :class="isResizing ? 'bg-[hsl(var(--primary))]' : 'bg-transparent hover:bg-[hsl(var(--primary))]/50'"
      ></div>
    </div>

    <div class="flex-1 relative min-h-0 bg-slate-50 dark:bg-slate-950/50">
      <div v-if="analytics.isLoadingMap.value" class="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center z-20">
        <div class="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow-lg">
          <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-primary-500 animate-spin" />
          <span class="text-sm font-medium">Caricamento mappa...</span>
        </div>
      </div>

      <ClientOnly>
        <SemanticMap
          :data="plotData"
          :layout="plotLayout"
          :config="plotConfig"
          @click="onPointClick"
          @hover="onPointHover"
          @unhover="onPointUnhover"
          class="absolute inset-0"
        />
      </ClientOnly>

      <transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="hoveredPoint" class="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-lg rounded-full px-4 py-2 flex items-center gap-3 border border-gray-200 dark:border-gray-700 max-w-xl">
          <div class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: getProjectColor(hoveredPoint.project_id) }"></div>
          <span class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ hoveredPoint.label }}</span>
          <span class="text-[10px] text-gray-500">{{ hoveredPoint.project_name }}</span>
          <span v-if="hoveredPoint.price" class="text-xs text-green-600 dark:text-green-400 font-medium">{{ formatCurrency(hoveredPoint.price) }}</span>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGlobalPropertyAnalytics, type PropertyPoint } from '~/composables/useGlobalPropertyAnalytics'

const analytics = useGlobalPropertyAnalytics()
const toast = useToast()

const hoveredPoint = ref<PropertyPoint | null>(null)
const selectedPoint = ref<PropertyPoint | null>(null)
const colorBy = ref<'project' | 'cluster' | 'wbs06' | 'properties'>('project')

const pointSize = ref(6)
const is3D = ref(false)
const showAxes = ref(false)
const showPoles = ref(true)

const selectedProjects = ref<{ label: string; value: string }[]>([])
const selectedYear = ref<{ label: string; value: number | null } | null>(null)
const selectedBU = ref<{ label: string; value: string | null } | null>(null)
const selectedPropertyKeys = ref<{ label: string; value: string }[]>([])
const matchAllProperties = ref(true)
const showAllPropertyKeys = ref(false)
const propertyKeyLimit = 12
const propertyMaxItems = ref(200)
const propertySleepSeconds = ref(1)
const propertyMinConfidence = ref(0.0)

const embeddingMode = ref<'description' | 'properties' | 'weighted' | 'concat'>('weighted')
const baseWeight = ref(0.4)
const detailWeight = ref(0.6)
const minConfidence = ref(0.5)

const sidebarWidth = ref(320)
const isResizing = ref(false)
const resizeStartX = ref(0)
const resizeStartWidth = ref(0)

function startResize(e: MouseEvent) {
  isResizing.value = true
  resizeStartX.value = e.clientX
  resizeStartWidth.value = sidebarWidth.value
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

function handleResize(e: MouseEvent) {
  if (!isResizing.value) return
  const deltaX = e.clientX - resizeStartX.value
  const newWidth = resizeStartWidth.value + deltaX
  if (newWidth >= 200 && newWidth <= 800) {
    sidebarWidth.value = newWidth
  }
}

function stopResize() {
  isResizing.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})

const propertyPoints = computed(() => {
  const selectedKeys = selectedPropertyKeys.value.map(k => k.value)
  let pts = analytics.filteredPoints.value
  if (selectedKeys.length === 0) return pts
  return pts.filter(point => {
    const keys = new Set(Object.keys(point.extracted_properties || {}))
    if (matchAllProperties.value) {
      return selectedKeys.every(key => keys.has(key))
    }
    return selectedKeys.some(key => keys.has(key))
  })
})

watch(propertyPoints, (points) => {
  if (selectedPoint.value && !points.find(p => p.id === selectedPoint.value?.id)) {
    selectedPoint.value = null
  }
})

watch(selectedProjects, (val) => {
  analytics.filters.projectIds = val.map(p => p.value)
}, { deep: true })

watch(selectedYear, (val) => {
  analytics.filters.year = val?.value ?? null
})

watch(selectedBU, (val) => {
  analytics.filters.businessUnit = val?.value ?? null
})

const projectOptions = computed(() =>
  analytics.availableProjects.value.map(p => ({
    label: p.name || p.code,
    value: p.id
  }))
)

const yearOptions = computed(() =>
  [{ label: 'Tutti gli anni', value: null }, ...analytics.availableYears.value.map(y => ({
    label: String(y),
    value: y
  }))]
)

const buOptions = computed(() =>
  [{ label: 'Tutte le BU', value: null }, ...analytics.availableBusinessUnits.value.map(bu => ({
    label: bu,
    value: bu
  }))]
)

const propertyKeyOptions = computed(() =>
  analytics.propertyKeyStats.value.map(stat => ({
    label: stat.key,
    value: stat.key
  }))
)

const displayedPropertyKeys = computed(() => {
  const all = analytics.propertyKeyStats.value
  return showAllPropertyKeys.value ? all : all.slice(0, propertyKeyLimit)
})

function propertyKeyActive(key: string) {
  return selectedPropertyKeys.value.some(item => item.value === key)
}

function togglePropertyKey(key: string) {
  const exists = selectedPropertyKeys.value.find(item => item.value === key)
  if (exists) {
    selectedPropertyKeys.value = selectedPropertyKeys.value.filter(item => item.value !== key)
  } else {
    selectedPropertyKeys.value = [...selectedPropertyKeys.value, { label: key, value: key }]
  }
}

const selectedPointProperties = computed(() => {
  if (!selectedPoint.value) return []
  const entries = Object.entries(selectedPoint.value.extracted_properties || {})
  return entries
    .map(([key, slot]) => ({ key, slot }))
    .sort((a, b) => a.key.localeCompare(b.key))
})

const colorByOptions = [
  { label: 'Progetto', value: 'project' },
  { label: 'Cluster', value: 'cluster' },
  { label: 'WBS06', value: 'wbs06' },
  { label: 'Proprieta', value: 'properties' },
]

const embeddingModeOptions = [
  { label: 'Descrizione', value: 'description' },
  { label: 'Proprieta', value: 'properties' },
  { label: 'Combinazione pesata', value: 'weighted' },
  { label: 'Testo combinato', value: 'concat' },
]

const wbs06Palette = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#10b981', '#f43f5e', '#0ea5e9',
  '#78716c', '#ea580c', '#65a30d', '#0891b2', '#7c3aed',
  '#db2777', '#0284c7', '#4d7c0f', '#dc2626', '#9333ea',
  '#059669', '#d97706', '#2563eb', '#c026d3', '#16a34a'
]

const wbs06ColorMap = computed(() => {
  const map = new Map<string, string>()
  const uniqueWbs = [...new Set(propertyPoints.value.map(p => p.wbs06_desc || p.wbs06 || 'N/A'))]
  uniqueWbs.sort().forEach((wbs, idx) => {
    map.set(wbs, wbs06Palette[idx % wbs06Palette.length])
  })
  return map
})

function getWbs06Color(wbs06: string): string {
  return wbs06ColorMap.value.get(wbs06 || 'N/A') || wbs06Palette[0]
}

const projectPalette = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#10b981', '#f43f5e', '#0ea5e9'
]

function getProjectColor(projectId: string): string {
  const projects = analytics.availableProjects.value
  const idx = projects.findIndex(p => p.id === projectId)
  if (idx < 0) return projectPalette[0]
  return projectPalette[idx % projectPalette.length]
}

const clusterPalette = [
  '#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ef4444',
  '#14b8a6', '#eab308', '#ec4899', '#0ea5e9', '#f59e0b',
  '#10b981', '#6366f1', '#d946ef', '#84cc16', '#06b6d4',
  '#f43f5e', '#8b5cf6', '#64748b'
]

function getClusterColor(clusterId: number): string {
  if (clusterId < 0) return '#888888'
  return clusterPalette[clusterId % clusterPalette.length]
}

const plotData = computed(() => {
  const pts = propertyPoints.value
  if (pts.length === 0) return []

  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)

  let colors: (string | number)[] = []
  let colorscale: string | undefined
  let showColorbar = false

  if (colorBy.value === 'project') {
    colors = pts.map(p => getProjectColor(p.project_id))
  } else if (colorBy.value === 'cluster') {
    colors = pts.map(p => getClusterColor(p.cluster ?? -1))
  } else if (colorBy.value === 'wbs06') {
    colors = pts.map(p => getWbs06Color(p.wbs06_desc || p.wbs06))
  } else {
    colors = pts.map(p => p.properties_count ?? Object.keys(p.extracted_properties || {}).length)
    colorscale = 'Viridis'
    showColorbar = true
  }

  const marker: any = {
    size: pts.map(() => pointSize.value),
    opacity: 0.85,
    color: colors,
    sizemode: 'diameter',
    line: { width: 0 },
  }

  if (colorscale) {
    marker.colorscale = colorscale
    if (showColorbar) {
      marker.colorbar = {
        thickness: 12,
        len: 0.4,
        bgcolor: 'rgba(0,0,0,0)',
        borderwidth: 0,
        tickfont: { size: 10, color: '#888' },
        title: { text: colorBy.value === 'properties' ? 'Proprieta' : 'Cluster', font: { size: 11 } }
      }
    }
  }

  const mainTrace: any = {
    x: xs,
    y: ys,
    customdata: pts,
    hoverinfo: 'none',
    marker
  }

  if (is3D.value) {
    mainTrace.type = 'scatter3d'
    mainTrace.mode = 'markers'
    mainTrace.z = pts.map(p => p.z ?? 0)
  } else {
    mainTrace.type = 'scattergl'
    mainTrace.mode = 'markers'
  }

  const traces: any[] = [mainTrace]

  if (showPoles.value && poles.value.length > 0) {
    const p = poles.value
    const px = p.map(pt => pt.x)
    const py = p.map(pt => pt.y)
    const plabels = p.map(pt => pt.description ? pt.description : `Polo ${pt.wbs6}`)

    const poleMarker = {
      size: pointSize.value * 2,
      symbol: is3D.value ? 'diamond' : 'star',
      color: '#ffd700',
      opacity: 1.0
    }

    const commonPoleTrace = {
      x: px, y: py,
      text: plabels,
      mode: 'markers+text',
      textposition: 'top center',
      textfont: { size: 11, color: '#000' },
      marker: poleMarker,
      name: 'Poles',
      hoverinfo: 'none',
    }

    if (is3D.value) {
      const pz = p.map(pt => pt.z ?? 0)
      traces.push({
        ...commonPoleTrace,
        type: 'scatter3d',
        z: pz,
        mode: 'markers',
        hoverinfo: 'text',
        hoverlabel: { bgcolor: '#FFF', bordercolor: '#ffd700', font: { size: 12, color: '#000' } }
      })
    } else {
      traces.push({
        ...commonPoleTrace,
        type: 'scatter',
      })
    }
  }

  return traces
})

const plotLayout = computed(() => {
  const axisConfig = {
    visible: showAxes.value,
    showgrid: showAxes.value,
    zeroline: false,
    showticklabels: showAxes.value,
    autorange: true,
  }

  const margin = showAxes.value
    ? { l: 50, r: 20, b: 40, t: 20 }
    : { l: 0, r: 0, b: 0, t: 0 }

  if (is3D.value) {
    return {
      margin,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      showlegend: false,
      uirevision: 'true',
      scene: {
        xaxis: { ...axisConfig },
        yaxis: { ...axisConfig },
        zaxis: { ...axisConfig },
        bgcolor: 'rgba(0,0,0,0)',
      },
      hovermode: 'closest'
    }
  }

  return {
    margin,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    showlegend: false,
    dragmode: 'pan',
    uirevision: 'true',
    xaxis: { ...axisConfig },
    yaxis: { ...axisConfig },
    hovermode: 'closest',
    autosize: true
  }
})

const plotConfig = {
  responsive: true,
  displayModeBar: 'hover',
  displaylogo: false,
  scrollZoom: true,
  modeBarButtonsToRemove: ['toImage', 'sendDataToCloud']
}

const poles = computed(() => analytics.poles.value ?? [])

function onPointClick(data: any) {
  if (!data?.points?.[0]) return
  const point = data.points[0].customdata as PropertyPoint
  selectedPoint.value = point

  toast.add({
    title: point.code || point.id,
    description: `${point.label} - ${point.project_name}`,
    color: 'info'
  })
}

function onPointHover(data: any) {
  if (!data?.points?.[0]) return
  hoveredPoint.value = data.points[0].customdata as PropertyPoint
}

function onPointUnhover() {
  hoveredPoint.value = null
}

function formatPropertyValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) {
    return value.map(v => String(v)).join(', ')
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function formatEvidence(evidence: unknown): string {
  if (Array.isArray(evidence)) {
    return evidence.filter(Boolean).map(v => String(v)).join(' | ')
  }
  return evidence ? String(evidence) : ''
}

function formatConfidence(confidence?: number): string {
  if (confidence === undefined || confidence === null) return '0%'
  return `${Math.round(confidence * 100)}%`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value)
}

async function triggerComputeMap() {
  const result = await analytics.computeMap({
    embeddingMode: embeddingMode.value,
    baseWeight: baseWeight.value,
    detailWeight: detailWeight.value,
    minConfidence: minConfidence.value,
  })
  if (result) {
    toast.add({
      title: 'Calcolo UMAP avviato',
      description: `Elaborazione in background (${embeddingMode.value}) per ${result.project_count || 'N'} progetti.`,
      color: 'success'
    })
  } else if (analytics.mapError.value) {
    toast.add({
      title: 'Errore',
      description: analytics.mapError.value,
      color: 'error'
    })
  }
}

async function triggerComputeProperties() {
  const result = await analytics.computeProperties({
    maxItems: propertyMaxItems.value,
    sleepSeconds: propertySleepSeconds.value,
    minConfidence: propertyMinConfidence.value,
  })

  if (result) {
    toast.add({
      title: 'Estrazione proprieta avviata',
      description: `Batch in background (max ${propertyMaxItems.value} voci).`,
      color: 'success'
    })
    await analytics.fetchMapData()
  } else if (analytics.mapError.value) {
    toast.add({
      title: 'Errore',
      description: analytics.mapError.value,
      color: 'error'
    })
  }
}
</script>
