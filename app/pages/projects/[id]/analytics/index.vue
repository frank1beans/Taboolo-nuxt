<template>
  <div class="h-full overflow-hidden">
    <MainPage :loading="isLoadingMap">
      <template #header>
        <PageHeader title="Analytics Progetto" :meta="analyticsSubtitle" :divider="false">
          <!-- Right slot cleared as tabs are moved to sidebar -->
        </PageHeader>
      </template>

      <template #default>
        <!-- Full-screen map container -->
        <div class="h-full relative rounded-xl overflow-hidden bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))]">
          
          <!-- Loading State with Chart Skeleton -->
          <ChartLoadingState 
            v-if="isLoadingMap" 
            class="absolute inset-0 z-30"
            message="Caricamento mappa semantica..."
            submessage="Elaborazione embeddings in corso"
          />

          <!-- Empty State: No Data -->
          <div 
            v-if="!isLoadingMap && displayedPoints.length === 0" 
            class="absolute inset-0 z-20 flex items-center justify-center bg-[hsl(var(--card)/0.9)]"
          >
            <div class="flex flex-col items-center gap-4 text-center max-w-sm p-6">
              <div class="w-16 h-16 rounded-2xl flex items-center justify-center bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
                <Icon name="heroicons:chart-bar" class="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-[hsl(var(--foreground))] mb-1">Nessun dato disponibile</h3>
                <p class="text-sm text-[hsl(var(--muted-foreground))]">
                  {{ hasSearchQuery ? 'Nessun risultato per la ricerca. Prova a modificare i criteri.' : 'Nessun punto trovato per questo progetto.' }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <UButton v-if="hasSearchQuery" color="primary" size="sm" icon="i-heroicons-x-mark" @click="clearSearch">
                  Cancella ricerca
                </UButton>
                <UButton v-else color="primary" size="sm" icon="i-heroicons-arrow-path" @click="fetchData">
                  Ricarica dati
                </UButton>
              </div>
            </div>
          </div>

          <!-- Semantic Map -->
          <ClientOnly>
            <SemanticMap 
              ref="semanticMapRef"
              :data="plotData" 
              :layout="plotLayout"
              :config="plotConfig"
              class="absolute inset-0"
              @click="onPointClick"
              @hover="onPointHover"
              @unhover="onPointUnhover"
            />
          </ClientOnly>

          <!-- Floating Toolbar (Map Controls) -->
          <!-- Note: Project selector hidden or fixed since we are in single project context? 
               For now we keep it but it should likely be locked to current project or removed. 
               We simply pre-select. -->
          <MapToolbar
            v-model:selected-projects="mapControls.selectedProjects.value"
            v-model:selected-year="mapControls.selectedYear.value"
            v-model:selected-b-u="mapControls.selectedBU.value"
            v-model:color-by="mapControls.colorBy.value"
            v-model:point-size="mapControls.pointSize.value"
            v-model:is3-d="mapControls.is3D.value"
            v-model:show-axes="mapControls.showAxes.value"
            v-model:show-poles="mapControls.showPoles.value"
            :project-options="projectOptions"
            :year-options="yearOptions"
            :bu-options="buOptions"
            :color-options="colorOptions"
            :loading="isLoadingMap"
            :mode="analyticsMode"
            :show-analysis-button="false"
            :analysis-loading="globalAnalytics.isLoadingAnalysis.value"
            :show-filters="false"
            @refresh="fetchData"
            @reset="resetFilters"
            @run-analysis="runPriceAnalysis"
          />

          <!-- Search Panel -->
          <div class="absolute top-4 right-4 left-4 sm:left-auto sm:w-80 z-20">
            <div class="bg-[hsl(var(--card))] shadow-xl rounded-xl border border-[hsl(var(--border))] overflow-hidden">
              <div class="flex items-center gap-2 px-3 py-2 border-b border-[hsl(var(--border))]">
                <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                <input
                  v-model="searchInput"
                  type="text"
                  placeholder="Cerca voci simili..."
                  class="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                >
                <button
                  v-if="searchInput"
                  class="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                  title="Cancella ricerca"
                  @click="clearSearch"
                >
                  <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
                </button>
              </div>

              <!-- Zoom Controls when searching -->
              <div v-if="hasSearchQuery && searchMatches.length > 0" class="px-3 py-2 border-b border-[hsl(var(--border))] flex items-center gap-2">
                <button
                  class="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
                  title="Zoom sui risultati"
                  @click="zoomToSearchResults"
                >
                  <UIcon name="i-heroicons-magnifying-glass-plus" class="w-3.5 h-3.5" />
                  Zoom Risultati
                </button>
                <button
                  class="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
                  title="Resetta vista"
                  @click="resetMapView"
                >
                  <UIcon name="i-heroicons-arrows-pointing-out" class="w-3.5 h-3.5" />
                </button>
              </div>

              <div v-if="hasSearchQuery" class="max-h-80 overflow-y-auto">
                <div class="px-3 py-2 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.3)] flex items-center justify-between">
                  <span>Voci simili</span>
                  <div class="flex items-center gap-2">
                    <UIcon v-if="semanticLoading" name="i-heroicons-arrow-path" class="w-3.5 h-3.5 animate-spin text-[hsl(var(--muted-foreground))]" />
                    <span class="font-mono">{{ searchMatches.length }}</span>
                  </div>
                </div>

                <div v-if="semanticLoading" class="px-3 py-3 text-xs text-[hsl(var(--muted-foreground))]">
                  Ricerca semantica in corso...
                </div>
                <div v-else-if="searchGroups.length === 0" class="px-3 py-3 text-xs text-[hsl(var(--muted-foreground))]">
                  Nessun risultato
                </div>

                <div v-for="group in searchGroups" :key="group.clusterId" class="border-t border-[hsl(var(--border))]">
                  <div class="px-3 py-2 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center justify-between">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: getClusterColor(group.clusterId) }" />
                      <span class="truncate">Cluster {{ group.clusterId }}</span>
                    </div>
                    <span class="font-mono">{{ group.count }}</span>
                  </div>

                  <button
                    v-for="hit in group.items"
                    :key="hit.point.id"
                    class="w-full text-left px-3 py-2 hover:bg-[hsl(var(--muted)/0.4)] transition-colors"
                    @click="selectSearchPoint(hit.point)"
                  >
                    <div class="flex items-start gap-2">
                      <span class="w-2 h-2 rounded-full mt-1 flex-shrink-0" :style="{ backgroundColor: getClusterColor(group.clusterId) }" />
                      <div class="min-w-0">
                        <div class="text-xs font-medium text-[hsl(var(--foreground))] truncate">
                          {{ hit.point.label }}
                        </div>
                        <div class="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
                          {{ hit.point.code || hit.point.id }} - {{ hit.point.project_name }}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Hover Info Card -->
          <transition 
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-2"
          >
            <div 
              v-if="hoveredPoint" 
                class="absolute bottom-4 right-4 z-20 bg-[hsl(var(--card))] shadow-xl rounded-lg border border-[hsl(var(--border))] p-3 max-w-xs"
              >              
              <div class="flex items-start gap-3">
                <div class="w-3 h-3 rounded-full flex-shrink-0 mt-1 shadow-sm" :style="{ backgroundColor: getProjectColor(hoveredPoint.project_id) }"/>
                <div class="min-w-0">
                  <div class="font-medium text-sm truncate">{{ hoveredPoint.label }}</div>
                  <div class="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    {{ hoveredPoint.project_name }} · {{ hoveredPoint.code }}
                  </div>
                  <div v-if="hoveredPoint.price" class="text-sm font-bold text-green-600 dark:text-green-400 mt-1">
                    {{ formatCurrency(hoveredPoint.price) }}
                  </div>
                </div>
              </div>
            </div>
          </transition>

        </div>
      </template>
    </MainPage>
    
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref, watch, watchEffect, onMounted, onUnmounted } from 'vue'
  import { useGlobalAnalytics, type GlobalPoint } from '~/composables/useGlobalAnalytics'
  import { useGlobalPropertyAnalytics, type PropertyPoint } from '~/composables/useGlobalPropertyAnalytics'
  import { useMapControls, WBS06_PALETTE } from '~/composables/useMapControls'
  import { catalogApi } from '~/lib/api/catalog'
  import { formatCurrency } from '~/lib/formatters'
  import MainPage from '~/components/layout/MainPage.vue'
import PageHeader from '~/components/layout/PageHeader.vue'
import MapToolbar from '~/components/analytics/MapToolbar.vue'
import PointDetailSidebar from '~/components/analytics/PointDetailSidebar.vue'
import ChartLoadingState from '~/components/ui/ChartLoadingState.vue'
import { useSidebarModules } from '~/composables/useSidebarModules'
import { useAppSidebar } from '~/composables/useAppSidebar'
import { useWbsTree } from '~/composables/useWbsTree'
import WbsModule from '~/components/sidebar/modules/WbsModule.vue'
import AnalyticsDataModule from '~/components/sidebar/modules/AnalyticsDataModule.vue'
import AnalyticsLegendModule from '~/components/sidebar/modules/AnalyticsLegendModule.vue'
import AnalyticsUmapModule from '~/components/sidebar/modules/AnalyticsUmapModule.vue'
import AnalysisResultsModule from '~/components/sidebar/modules/AnalysisResultsModule.vue'

// Capture route info for Project Context
const route = useRoute()
const projectId = route.params.id as string

definePageMeta({
  disableDefaultSidebar: true,
})


// Analytics composables
const globalAnalytics = useGlobalAnalytics()
const propertyAnalytics = useGlobalPropertyAnalytics()
const toast = useToast()

// Shared map controls
const mapControls = useMapControls({
  defaultPointSize: 6,
  defaultShowPoles: true
})

// ========== MODE & UI STATE ==========
const analyticsMode = ref<'global' | 'properties'>('global')
const hoveredPoint = ref<GlobalPoint | PropertyPoint | null>(null)
const selectedPoint = ref<PropertyPoint | null>(null)
const clickedPoint = ref<GlobalPoint | PropertyPoint | null>(null)

const { registerModule, unregisterModule, setActiveModule } = useSidebarModules()
const { showDefaultSidebar } = useAppSidebar()


const resetFilters = () => {
  currentAnalytics.value.resetFilters()
  // Re-apply project filter if in project context
  if (projectId && currentAnalytics.value.availableProjects.value.length) {
    currentAnalytics.value.filters.projectIds = [projectId]
    const found = currentAnalytics.value.availableProjects.value.find((p: any) => p.id === projectId)
    if (found) {
      mapControls.selectedProjects.value = [{ label: found.name || found.code, value: found.id }]
    }
  }
}

const searchInput = ref('')
const debouncedQuery = ref('')

// Reference to the SemanticMap component for zoom control
const semanticMapRef = ref<InstanceType<typeof import('~/components/visualizer/SemanticMap.vue').default> | null>(null)

// Poles
interface Pole {
  x: number
  y: number
  z?: number
  description?: string
  wbs6?: string
}
const poles = ref<Pole[]>([])

// Recalculate Map Handler
const handleRecalculateMap = async () => {
  try {
    const res = await globalAnalytics.recalculateMap()
    if (res?.status === 'accepted') {
      toast.add({
        title: 'Calcolo avviato',
        description: 'Ricalcolo mappa avviato in background.'
      })

      const updated = await globalAnalytics.waitForMapUpdate()
      if (updated) {
        toast.add({
          title: 'Mappa aggiornata',
          description: 'Dati ricaricati dopo il ricalcolo.'
        })
      } else {
        toast.add({
          title: 'Calcolo in corso',
          description: 'Il ricalcolo richiede piu tempo. Aggiorna tra poco.',
          color: 'orange' as any
        })
      }
    }
  } catch {
    toast.add({ 
      title: 'Errore', 
      description: 'Impossibile avviare il calcolo.', 
      color: 'red' as any 
    })
  }
}

// ========== COMPUTED ==========
const currentAnalytics = computed(() => 
  analyticsMode.value === 'global' ? globalAnalytics : propertyAnalytics
)

// Initialize filters with current project
watchEffect(() => {
  if (!projectId) return
  const available = currentAnalytics.value.availableProjects.value
  if (available.length === 0) return

  if (
    currentAnalytics.value.filters.projectIds.length === 0 ||
    !currentAnalytics.value.filters.projectIds.includes(projectId)
  ) {
    currentAnalytics.value.filters.projectIds = [projectId]
  }

  const found = available.find((p: any) => p.id === projectId)
  if (found) {
    mapControls.selectedProjects.value = [{ label: found.name || found.code, value: found.id }]
  }
})

const MIN_SEMANTIC_QUERY = 3

const isLoadingMap = computed(() => currentAnalytics.value.isLoadingMap.value)
const hasSearchQuery = computed(() => debouncedQuery.value.trim().length >= MIN_SEMANTIC_QUERY)

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchInput, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedQuery.value = val
  }, 180)
})

const analyticsSubtitle = computed(() => {
  if (analyticsMode.value === 'global') {
    const total = basePoints.value.length.toLocaleString()
    const shown = displayedPoints.value.length.toLocaleString()
    const pts = hasSearchQuery.value ? `${shown} risultati su ${total} punti` : `${shown} punti`
    const pls = poles.value.length
    const projects = globalAnalytics.mapData.value?.projects?.length || 0
    return `${pts} · ${pls} poli · ${projects} progetti`
  } else {
    const total = basePoints.value.length.toLocaleString()
    const shown = displayedPoints.value.length.toLocaleString()
    const pts = hasSearchQuery.value ? `${shown} risultati su ${total} punti con proprietà` : `${shown} punti con proprietà`
    const projects = propertyAnalytics.mapData.value?.projects?.length || 0
    return `${pts} · ${projects} progetti`
  }
})

const projectOptions = computed(() => {
  return currentAnalytics.value.availableProjects.value.map((p: any) => ({
    label: p.name || p.code,
    value: p.id
  }))
})

const yearOptions = computed(() => {
  return [
    { label: 'Tutti gli anni', value: null }, 
    ...currentAnalytics.value.availableYears.value.map((y: number) => ({
      label: String(y),
      value: y
    }))
  ]
})

const buOptions = computed(() => {
  return [
    { label: 'Tutte le BU', value: null }, 
    ...currentAnalytics.value.availableBusinessUnits.value.map((bu: string) => ({
      label: bu,
      value: bu
    }))
  ]
})

const colorOptions = computed(() => {
  if (analyticsMode.value === 'properties') {
    return [
      { label: 'Progetto', value: 'project' },
      { label: 'Cluster', value: 'cluster' },
      { label: 'WBS06', value: 'wbs06' },
      { label: 'Proprietà', value: 'properties' },
    ]
  }
  return [
    { label: 'Progetto', value: 'project' },
    { label: 'Cluster', value: 'cluster' },
    { label: 'Prezzo', value: 'amount' },
    { label: 'WBS06', value: 'wbs06' },
  ]
})

const sidebarFilters = computed(() => currentAnalytics.value.filters)
const sidebarProjects = computed(() => currentAnalytics.value.availableProjects.value)
const sidebarYears = computed(() => currentAnalytics.value.availableYears.value)
const sidebarBusinessUnits = computed(() => currentAnalytics.value.availableBusinessUnits.value)
const sidebarLoading = computed(() =>
  currentAnalytics.value.isLoadingMap.value || currentAnalytics.value.isComputingMap.value
)
const sidebarColorBy = computed(() =>
  mapControls.colorBy.value as 'project' | 'cluster' | 'amount' | 'wbs06' | 'properties'
)

// Visibility sets
const visibleProjects = ref<Set<string>>(new Set())
const visibleWbs6 = ref<Set<string>>(new Set())
const visibleClusters = ref<Set<number>>(new Set())

// Visibility-filtered points (global mode)
const visibilityFilteredPoints = computed(() => {
  return globalAnalytics.filteredPoints.value.filter((p: GlobalPoint) => {
    return visibleProjects.value.has(p.project_id) && 
           visibleWbs6.value.has(p.wbs06_desc || p.wbs06 || 'N/A') &&
           visibleClusters.value.has(p.cluster ?? -1)
  })
})

// Property-filtered points (property mode)
const propertyPoints = computed(() => {
  return propertyAnalytics.filteredPoints.value
})

type SearchPoint = GlobalPoint | PropertyPoint
type SearchHit = { point: SearchPoint; score: number; clusterId: number }
type SearchGroup = { clusterId: number; count: number; items: SearchHit[]; topScore: number }

const MAX_CLUSTER_ITEMS = 6
const MAX_GROUPS = 8
const SEMANTIC_TOP_K = 100

const semanticResults = ref<{ id: string; score: number }[]>([])
const semanticLoading = ref(false)
const lastSemanticQuery = ref('')
let searchToken = 0

const basePoints = computed(() => {
  return analyticsMode.value === 'global' ? visibilityFilteredPoints.value : propertyPoints.value
})

// WBS Tree for Analytics
const {
  wbsNodes,
  selectedWbsNode,
  onWbsNodeSelected,
} = useWbsTree(basePoints as any, {
  getLevels: (item: any) => {
    const levels: { code: string; name?: string; level?: number }[] = []
    if (item.wbs06) {
      levels.push({ code: item.wbs06, name: item.wbs06_desc || item.wbs06, level: 6 })
    }
    // We can add more levels if available in points
    return levels
  }
})

// Sync WBS filter back to map visibility
watch(selectedWbsNode, (node) => {
  if (node) {
    visibleWbs6.value.clear()
    visibleWbs6.value.add(node.name)
  } else {
    legendWbs6Categories.value.forEach(w => visibleWbs6.value.add(w.code))
  }
})

const semanticProjectId = computed(() => {
  // If we are in project context, ALWAYS force semantic search to use that project?
  // Or just rely on mapControls which we preset?
  // Let's defer to mapControls for consistency
  const ids = mapControls.selectedProjects.value.map(p => p.value)
  return ids.length === 1 ? ids[0] : undefined
})

const pointById = computed(() => {
  const map = new Map<string, SearchPoint>()
  basePoints.value.forEach(point => {
    map.set(point.id, point)
  })
  return map
})

const runSemanticSearch = async (query: string) => {
  if (query === lastSemanticQuery.value) return
  const token = ++searchToken
  semanticLoading.value = true
  semanticResults.value = []

  try {
    const results = await catalogApi.semanticSearch({
      query,
      projectId: semanticProjectId.value,
      topK: SEMANTIC_TOP_K,
    })
    if (token !== searchToken) return
    semanticResults.value = results.map(result => ({
      id: String(result.id),
      score: result.score,
    }))
    lastSemanticQuery.value = query
  } catch {
    if (token !== searchToken) return
    semanticResults.value = []
    lastSemanticQuery.value = ''
  } finally {
    if (token === searchToken) semanticLoading.value = false
  }
}

watch(debouncedQuery, (value) => {
  const query = value.trim()
  if (query.length < MIN_SEMANTIC_QUERY) {
    semanticResults.value = []
    semanticLoading.value = false
    lastSemanticQuery.value = ''
    return
  }
  runSemanticSearch(query)
})

watch(semanticProjectId, () => {
  const query = debouncedQuery.value.trim()
  if (query.length < MIN_SEMANTIC_QUERY) return
  runSemanticSearch(query)
})

const searchMatches = computed<SearchHit[]>(() => {
  if (!hasSearchQuery.value) return []
  if (semanticResults.value.length === 0) return []
  const points = pointById.value
  const matches: SearchHit[] = []

  semanticResults.value.forEach((result) => {
    const point = points.get(String(result.id))
    if (!point) return
    matches.push({
      point,
      score: result.score,
      clusterId: point.cluster ?? -1
    })
  })

  matches.sort((a, b) => b.score - a.score)
  return matches
})

const searchMatchedIds = computed(() => new Set(searchMatches.value.map(hit => hit.point.id)))

const searchGroups = computed<SearchGroup[]>(() => {
  if (!hasSearchQuery.value) return []
  const groups = new Map<number, SearchGroup>()

  for (const hit of searchMatches.value) {
    const existing = groups.get(hit.clusterId)
    if (existing) {
      existing.count += 1
      existing.topScore = Math.max(existing.topScore, hit.score)
      existing.items.push(hit)
    } else {
      groups.set(hit.clusterId, {
        clusterId: hit.clusterId,
        count: 1,
        topScore: hit.score,
        items: [hit]
      })
    }
  }

  const result = Array.from(groups.values())
  result.forEach(group => {
    group.items.sort((a, b) => b.score - a.score)
    group.items = group.items.slice(0, MAX_CLUSTER_ITEMS)
  })

  result.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return b.topScore - a.topScore
  })

  return result.slice(0, MAX_GROUPS)
})

const displayedPoints = computed(() => {
  if (!hasSearchQuery.value) return basePoints.value
  if (semanticLoading.value && semanticResults.value.length === 0) return basePoints.value
  const ids = searchMatchedIds.value
  if (ids.size === 0) return []
  return basePoints.value.filter(p => ids.has(p.id))
})

const clearSearch = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = null
  searchToken += 1
  searchInput.value = ''
  debouncedQuery.value = ''
  semanticResults.value = []
  semanticLoading.value = false
  lastSemanticQuery.value = ''
  // Reset view when clearing search
  resetMapView()
}

const selectSearchPoint = (point: SearchPoint) => {
  clickedPoint.value = point
  if (analyticsMode.value === 'properties') {
    selectedPoint.value = point as PropertyPoint
  }
  // Zoom to the selected point
  zoomToPoint(point)
}

// ========== MAP ZOOM FUNCTIONS ==========

/**
 * Zoom to all search results
 */
const zoomToSearchResults = () => {
  if (!semanticMapRef.value || searchMatches.value.length === 0) return
  
  // Get indices of matched points in the displayedPoints array
  const matchedIds = new Set(searchMatches.value.map(m => m.point.id))
  const indices: number[] = []
  
  displayedPoints.value.forEach((point, index) => {
    if (matchedIds.has(point.id)) {
      indices.push(index)
    }
  })
  
  if (indices.length > 0) {
    semanticMapRef.value.zoomToPoints(indices, { transition: true, padding: 0.15 })
  }
}

/**
 * Zoom to a specific point
 */
const zoomToPoint = (point: SearchPoint) => {
  if (!semanticMapRef.value) return
  
  const index = displayedPoints.value.findIndex(p => p.id === point.id)
  if (index >= 0) {
    semanticMapRef.value.zoomToPoints([index], { transition: true, padding: 0.3 })
  }
}

/**
 * Reset the map view to show all points
 */
const resetMapView = () => {
  if (!semanticMapRef.value) return
  semanticMapRef.value.resetView({ transition: true })
}

// ========== PLOT DATA ==========
const wbs06ColorMap = computed(() => {
  const map = new Map<string, string>()
  const pts = analyticsMode.value === 'global' ? globalAnalytics.points.value : propertyPoints.value
  const uniqueWbs = [...new Set(pts.map((p: SearchPoint) => p.wbs06_desc || p.wbs06 || 'N/A'))]
  uniqueWbs.sort().forEach((wbs, idx) => {
    map.set(String(wbs), WBS06_PALETTE[idx % WBS06_PALETTE.length])
  })
  return map
})

function getProjectColor(projectId: string): string {
  return mapControls.getProjectColor(projectId, currentAnalytics.value.availableProjects.value)
}

function getClusterColor(clusterId: number): string {
  return mapControls.getClusterColor(clusterId)
}

function getWbs06Color(wbs06: string): string {
  return mapControls.getWbs06Color(wbs06, wbs06ColorMap.value)
}

const plotData = computed(() => {
  const pts = displayedPoints.value
  if (pts.length === 0) return []

  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const colorBy = mapControls.colorBy.value

  let colors: (string | number)[]
  let colorscale: string | undefined
  let showColorbar = false

  if (colorBy === 'project') {
    colors = pts.map((p) => getProjectColor(p.project_id || ''))
  } else if (colorBy === 'cluster') {
    colors = pts.map((p) => getClusterColor(p.cluster ?? -1))
  } else if (colorBy === 'wbs06') {
    colors = pts.map((p) => getWbs06Color(p.wbs06_desc || p.wbs06 || 'N/A'))
  } else if (colorBy === 'properties' && analyticsMode.value === 'properties') {
    colors = pts.map((p) => (p as PropertyPoint).properties_count ?? Object.keys((p as PropertyPoint).extracted_properties || {}).length)
    colorscale = 'Viridis'
    showColorbar = true
  } else {
    // Use log scale for price to better distribute colors (avoid all points looking the same)
    colors = pts.map((p) => {
      const price = (p as GlobalPoint).price ?? 0
      return price > 0 ? Math.log10(price + 1) : 0
    })
    colorscale = 'Viridis'
    showColorbar = true
  }

  const outlierSet = globalAnalytics.outlierIds.value
  const pointSize = mapControls.pointSize.value
  const sizes = pts.map((p) => outlierSet.has(p.id) ? pointSize * 1.8 : pointSize)

  const marker: any = {
    size: sizes,
    opacity: 0.85,
    color: colors,
    sizemode: 'diameter',
    line: { width: 0 },
  }

  if (colorscale) {
    marker.colorscale = colorscale
    if (showColorbar) {
      marker.colorbar = { thickness: 12, len: 0.4, bgcolor: 'rgba(0,0,0,0)', borderwidth: 0 }
    }
  }

  const mainTrace: any = {
    x: xs, y: ys, customdata: pts, hoverinfo: 'none', marker
  }

  if (mapControls.is3D.value) {
    mainTrace.type = 'scatter3d'
    mainTrace.mode = 'markers'
    mainTrace.z = pts.map((p) => p.z ?? 0)
  } else {
    mainTrace.type = 'scattergl'
    mainTrace.mode = 'markers'
  }

  const traces: any[] = [mainTrace]

  // Add poles
  const currentPoles = analyticsMode.value === 'global' ? poles.value : propertyAnalytics.poles.value ?? []
  if (mapControls.showPoles.value && currentPoles.length > 0) {
    const p = currentPoles
    const px = p.map((pt) => pt.x)
    const py = p.map((pt) => pt.y)
    const plabels = p.map((pt) => pt.description || `Polo ${pt.wbs6}`)
    
    const poleTrace: any = {
      x: px, y: py, text: plabels, mode: 'markers+text',
      textposition: 'top center', textfont: { size: 11, color: '#000' },
      marker: { size: pointSize * 2, symbol: 'star', color: '#ffd700', opacity: 1.0 },
      name: 'Poles', hoverinfo: 'none',
    }

    if (mapControls.is3D.value) {
      poleTrace.type = 'scatter3d'
      poleTrace.z = p.map((pt) => pt.z ?? 0)
      poleTrace.mode = 'markers'
    } else {
      poleTrace.type = 'scatter'
    }
    traces.push(poleTrace)
  }
  return traces
})

const plotLayout = computed(() => {
  const showAxes = mapControls.showAxes.value
  // Don't use autorange: true - it resets zoom on every update
  // Use uirevision to preserve the user's zoom/pan state
  return {
    margin: { t: 0, b: 0, l: 0, r: 0 },
    showlegend: false,
    hovermode: 'closest',
    uirevision: mapControls.is3D.value ? 'true' : 'false', // Keep zoom state unless switching 2D/3D (which forces a redraw)
    scene: {
      xaxis: { title: '', showgrid: showAxes, zeroline: showAxes, showticklabels: false, visible: showAxes },
      yaxis: { title: '', showgrid: showAxes, zeroline: showAxes, showticklabels: false, visible: showAxes },
      zaxis: { title: '', showgrid: showAxes, zeroline: showAxes, showticklabels: false, visible: showAxes },
      dragmode: 'orbit',
      aspectmode: 'cube'
    },
    xaxis: { 
      showgrid: showAxes, 
      zeroline: showAxes, 
      showticklabels: false, 
      visible: showAxes,
      // Default range (optional, can be better handled by Plotly's auto-range on first render)
    },
    yaxis: { 
      showgrid: showAxes, 
      zeroline: showAxes, 
      showticklabels: false, 
      visible: showAxes,
      scaleanchor: 'x',
      scaleratio: 1
    },
    dragmode: 'pan',
  }
})

const plotConfig = {
  responsive: true,
  displayModeBar: false,
  scrollZoom: true
}

const onPointClick = (event: any) => {
  const point = event.points[0]?.customdata
  if (point) {
    clickedPoint.value = point
  }
}

const onPointHover = (event: any) => {
  const point = event.points[0]?.customdata
  if (point) {
    hoveredPoint.value = point
  }
}

const onPointUnhover = () => {
  hoveredPoint.value = null
}

const runPriceAnalysis = async () => {
  if (analyticsMode.value !== 'global') return
  await globalAnalytics.runAnalysis()
}

// Legend handling (helper)
const getProjectPointCount = (projectId: string) => {
  return basePoints.value.filter(p => p.project_id === projectId).length
}

const legendProjects = computed(() => {
  return currentAnalytics.value.availableProjects.value
})

const legendWbs6Categories = computed(() => {
  const counts = new Map<string, number>()
  const descs = new Map<string, string>()
  
  const pts = analyticsMode.value === 'global' ? globalAnalytics.points.value : propertyPoints.value // use unfiltered for total counts
  
  pts.forEach((p: SearchPoint) => {
    const code = p.wbs06 || 'N/A'
    counts.set(code, (counts.get(code) || 0) + 1)
    if (p.wbs06_desc) descs.set(code, p.wbs06_desc)
  })

  return Array.from(counts.entries()).map(([code, count]) => ({
    code,
    desc: descs.get(code) || code,
    count
  })).sort((a, b) => b.count - a.count)
})

const legendClusters = computed(() => {
  const counts = new Map<number, number>()
  const pts = analyticsMode.value === 'global' ? globalAnalytics.points.value : propertyPoints.value
  
  pts.forEach((p: SearchPoint) => {
    const c = p.cluster ?? -1
    counts.set(c, (counts.get(c) || 0) + 1)
  })

  return Array.from(counts.entries()).map(([id, count]) => ({
    id,
    count
  })).sort((a, b) => a.id - b.id)
})

// Initialize Visibility
const initVisibility = () => {
  // Show all projects
  currentAnalytics.value.availableProjects.value.forEach((p: any) => visibleProjects.value.add(p.id))
  
  // Show all WBS6
  const pts = analyticsMode.value === 'global' ? globalAnalytics.points.value : propertyPoints.value
  pts.forEach((p: SearchPoint) => {
    visibleWbs6.value.add(p.wbs06_desc || p.wbs06 || 'N/A')
    visibleClusters.value.add(p.cluster ?? -1)
  })
}

// Watch for data load to init visibility
watch(() => globalAnalytics.points.value.length, (newVal, oldVal) => {
  if (newVal > 0 && oldVal === 0) {
    initVisibility()
  }
})

// Handlers for visibility
const handleToggleVisibility = (type: 'project' | 'wbs06' | 'cluster', id: string | number) => {
  if (type === 'project') {
    const val = id as string
    if (visibleProjects.value.has(val)) visibleProjects.value.delete(val)
    else visibleProjects.value.add(val)
  } else if (type === 'wbs06') {
    const val = id as string
    if (visibleWbs6.value.has(val)) visibleWbs6.value.delete(val)
    else visibleWbs6.value.add(val)
  } else {
    // cluster
    const val = id as number
    if (visibleClusters.value.has(val)) visibleClusters.value.delete(val)
    else visibleClusters.value.add(val)
  }
}

const handleShowAll = (type: 'project' | 'wbs06' | 'cluster') => {
  if (type === 'project') {
    currentAnalytics.value.availableProjects.value.forEach((p: any) => visibleProjects.value.add(p.id))
  } else if (type === 'wbs06') {
     legendWbs6Categories.value.forEach(w => visibleWbs6.value.add(w.code))
  } else if (type === 'cluster') {
    legendClusters.value.forEach(c => visibleClusters.value.add(c.id))
  }
}

const handleHideAll = (type: 'project' | 'wbs06' | 'cluster') => {
  if (type === 'project') visibleProjects.value.clear()
  else if (type === 'wbs06') visibleWbs6.value.clear()
  else if (type === 'cluster') visibleClusters.value.clear()
}

const handleUpdateAnalysisParam = (key: any, value: any) => {
  // @ts-ignore
  globalAnalytics.analysisParams[key] = value
}

const umapLoading = computed(() =>
  globalAnalytics.isLoadingMap.value || globalAnalytics.isComputingMap.value
)
const analysisResult = computed(() => globalAnalytics.analysisResult.value)
const analysisLoading = computed(() => globalAnalytics.isLoadingAnalysis.value)
const analysisError = computed(() => globalAnalytics.analysisError.value)

const registerAnalyticsModules = () => {
  registerModule({
    id: 'analytics-data',
    label: 'Dati',
    icon: 'heroicons:adjustments-horizontal',
    order: 10,
    component: AnalyticsDataModule,
    props: reactive({
      mode: analyticsMode,
      filters: sidebarFilters,
      availableProjects: sidebarProjects,
      availableYears: sidebarYears,
      availableBusinessUnits: sidebarBusinessUnits,
      isLoadingMap: sidebarLoading,
      'onUpdate:mode': (value: 'global' | 'properties') => {
        analyticsMode.value = value
      },
      'onUpdate:filters': (value: any) => {
        Object.assign(currentAnalytics.value.filters, value)
      },
      onRefreshMap: () => currentAnalytics.value.fetchMapData(),
    }),
  })

  registerModule({
    id: 'analytics-umap',
    label: 'UMAP',
    icon: 'heroicons:cpu-chip',
    order: 20,
    component: AnalyticsUmapModule,
    props: reactive({
      mapParams: globalAnalytics.mapParams,
      isLoadingMap: umapLoading,
      'onUpdate:mapParams': (value: any) => Object.assign(globalAnalytics.mapParams, value),
      onRecalculateMap: handleRecalculateMap,
    }),
  })

  registerModule({
    id: 'analytics-legend',
    label: 'Legenda',
    icon: 'heroicons:swatch',
    order: 30,
    component: AnalyticsLegendModule,
    props: reactive({
      colorBy: sidebarColorBy,
      projects: legendProjects,
      wbs6Categories: legendWbs6Categories,
      clusters: legendClusters,
      visibleProjects,
      visibleWbs6,
      visibleClusters,
      getProjectColor,
      getWbs06Color,
      getClusterColor,
      getProjectPointCount,
      onToggleVisibility: handleToggleVisibility,
      onShowAll: handleShowAll,
      onHideAll: handleHideAll,
    }),
  })

  if (analyticsMode.value === 'global') {
    registerModule({
      id: 'analytics-analysis',
      label: 'Analisi',
      icon: 'heroicons:chart-bar',
      order: 40,
      component: AnalysisResultsModule,
      props: reactive({
        analysisParams: globalAnalytics.analysisParams,
        analysisResult,
        analysisLoading,
        analysisError,
        onUpdateAnalysisParam: handleUpdateAnalysisParam,
        onRunAnalysis: runPriceAnalysis,
        onToggleVisibility: handleToggleVisibility,
      }),
    })
  }

  registerModule({
    id: 'wbs',
    label: 'WBS',
    icon: 'heroicons:squares-2x2',
    order: 45,
    component: WbsModule,
    props: reactive({
      nodes: wbsNodes,
      selectedNodeId: computed(() => selectedWbsNode.value?.id ?? null),
      onNodeSelected: (node: any) => onWbsNodeSelected(node),
    }),
  })
}

watch(clickedPoint, (point) => {
  if (point) {
    registerModule({
      id: 'analytics-detail',
      label: 'Dettaglio',
      icon: 'heroicons:document-text',
      order: 5,
      group: 'secondary',
      component: PointDetailSidebar,
      props: reactive({
        point: point,
        mode: analyticsMode.value,
        onClose: () => {
          clickedPoint.value = null
        },
      }),
    })
    setActiveModule('analytics-detail')
    return
  }
  unregisterModule('analytics-detail')
})

// Initial fetch
onMounted(async () => {
  registerAnalyticsModules()
  await fetchData()
  // Preset project filter if in project context
  if (projectId && currentAnalytics.value.availableProjects.value.length) {
      const found = currentAnalytics.value.availableProjects.value.find((p: any) => p.id === projectId)
      if (found) {
          mapControls.selectedProjects.value = [{ label: found.name || found.code, value: found.id }]
      }
  }
})

onUnmounted(() => {
  unregisterModule('analytics-data')
  unregisterModule('analytics-umap')
  unregisterModule('analytics-legend')
  unregisterModule('analytics-analysis')
  unregisterModule('analytics-detail')
})

const fetchData = async () => {
  if (analyticsMode.value === 'global') {
    if (globalAnalytics.points.value.length === 0) {
      await globalAnalytics.fetchMapData()
    }
  } else {
    if (propertyAnalytics.points.value.length === 0) {
      await propertyAnalytics.fetchMapData()
    }
  }
}

watch(analyticsMode, (mode) => {
  fetchData()
  if (mode === 'global') {
    registerModule({
      id: 'analytics-analysis',
      label: 'Analisi',
      icon: 'heroicons:chart-bar',
      order: 40,
      component: AnalysisResultsModule,
      props: reactive({
        analysisParams: globalAnalytics.analysisParams,
        analysisResult,
        analysisLoading,
        analysisError,
        onUpdateAnalysisParam: handleUpdateAnalysisParam,
        onRunAnalysis: runPriceAnalysis,
        onToggleVisibility: handleToggleVisibility,
      }),
    })
  } else {
    unregisterModule('analytics-analysis')
  }
  // Reset visibility when mode changes? Maybe not needed if logic handles it.
  // But we need to ensure visibility sets are populated for the new data
  setTimeout(initVisibility, 100)
})

</script>
