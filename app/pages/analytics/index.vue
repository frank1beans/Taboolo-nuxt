<template>
  <div class="flex flex-col h-screen overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
    <!-- 1. Standard Page Header -->
    <div 
      class="flex-shrink-0"
      style="padding-left: var(--page-pad-x); padding-right: var(--page-pad-x); padding-top: var(--page-pad-top); padding-bottom: 8px;"
    >
      <PageHeader title="Analytics" :meta="analyticsSubtitle">
        <template #rightSlot>
          <!-- Tab Switcher (moved to right slot for compactness) -->
           <div class="flex items-center gap-1 p-1 mr-4 bg-[hsl(var(--muted)/0.3)] rounded-lg border border-[hsl(var(--border))]">
              <button 
                @click="activeTab = 'explore'"
                :class="['px-3 py-1.5 text-xs font-medium rounded-md transition-all', 
                  activeTab === 'explore' ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]']"
              >
                Esplora
              </button>
              <button 
                @click="activeTab = 'analysis'"
                :class="['px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5', 
                  activeTab === 'analysis' ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]']"
              >
                Analisi
                <span v-if="analytics.analysisResult.value?.outliers_found" class="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                  {{ analytics.analysisResult.value.outliers_found }}
                </span>
              </button>
           </div>

          <!-- Primary Action -->
          <UButton 
            v-if="activeTab === 'analysis'"
            color="primary" 
            variant="solid"
            icon="i-heroicons-play"
            :loading="analytics.isLoadingAnalysis.value"
            @click="runPriceAnalysis"
          >
            Esegui Analisi
          </UButton>
        </template>
      </PageHeader>
    </div>

    <!-- 2. Main Content Area (Sidebar + Map) -->
    <div class="flex-1 flex overflow-hidden px-6 pb-6 gap-6 pt-2">
      
      <!-- Sidebar Card (Resizable) -->
      <aside 
        ref="sidebarRef"
        class="flex-shrink-0 flex flex-col rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm overflow-hidden relative transition-all"
        :style="{ width: sidebarWidth + 'px' }"
      >
        <!-- Filter Header -->
        <div class="p-4 border-b border-[hsl(var(--border))] flex justify-between items-center bg-[hsl(var(--muted)/0.2)]">
           <h3 class="font-semibold text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Configurazione</h3>
           <UTooltip text="Reset filtri">
             <UButton icon="i-heroicons-arrow-path" size="2xs" color="gray" variant="ghost" @click="resetFilters" />
           </UTooltip>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
          
          <!-- Section: Data Source -->
          <div class="space-y-3">
            <h4 class="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Origine Dati</h4>
            
            <div class="space-y-3">
              <!-- Projects -->
              <div class="space-y-1">
                <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Progetti</label>
                <USelectMenu
                  v-model="selectedProjects"
                  :items="projectOptions"
                  value-key="value"
                  multiple
                  placeholder="Tutti i progetti"
                  size="sm"
                />
              </div>
              
              <!-- Year/BU Group -->
              <div class="grid grid-cols-2 gap-2">
                 <div class="space-y-1">
                    <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Anno</label>
                    <USelectMenu v-model="selectedYear" :items="yearOptions" placeholder="Tutti" size="sm" />
                 </div>
                 <div class="space-y-1">
                    <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Business Unit</label>
                    <USelectMenu v-model="selectedBU" :items="buOptions" placeholder="Tutte" size="sm" />
                 </div>
              </div>

              <!-- Action: Reload -->
              <UButton 
                block 
                size="xs"
                color="primary" 
                variant="soft"
                icon="i-heroicons-funnel"
                :loading="analytics.isLoadingMap.value"
                @click="analytics.fetchMapData" 
                class="mt-2"
              >
                Aggiorna Mappa
              </UButton>
            </div>
          </div>

          <!-- Section: Visualization (Explore Tab Only) -->
          <div v-if="activeTab === 'explore'" class="pt-4 border-t border-[hsl(var(--border))] space-y-4">
            <h4 class="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Visualizzazione</h4>
            
            <div class="space-y-1">
               <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Colorazione</label>
               <USelectMenu v-model="colorBy" :items="colorByOptions" value-key="value" size="sm" />
            </div>

            <!-- Sliders & Toggles -->
            <div class="space-y-4">
                <!-- Point Size -->
                <div>
                  <div class="flex justify-between items-center mb-1">
                    <span class="text-[10px] text-[hsl(var(--muted-foreground))]">Dimensione</span>
                    <span class="text-[10px] font-mono bg-[hsl(var(--secondary))] px-1 rounded">{{ pointSize }}px</span>
                  </div>
                  <input type="range" v-model.number="pointSize" min="2" max="15" class="w-full accent-[hsl(var(--primary))] h-1.5 bg-[hsl(var(--secondary))] rounded-lg cursor-pointer" />
                </div>
                
                <!-- Toggles Row -->
                <div class="grid grid-cols-3 gap-2">
                      <button 
                        @click="showPoles = !showPoles"
                        class="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all text-[10px]"
                        :class="showPoles ? 'bg-[hsl(var(--primary)/0.1)] border-[hsl(var(--primary)/0.3)] text-[hsl(var(--primary))] font-medium' : 'bg-[hsl(var(--secondary)/0.5)] border-transparent text-[hsl(var(--muted-foreground))]'"
                      >
                        <UIcon name="i-heroicons-map-pin" class="w-4 h-4" />
                        Poli
                      </button>
                   
                      <button 
                        @click="is3D = !is3D"
                        class="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all text-[10px]"
                        :class="is3D ? 'bg-[hsl(var(--primary)/0.1)] border-[hsl(var(--primary)/0.3)] text-[hsl(var(--primary))] font-medium' : 'bg-[hsl(var(--secondary)/0.5)] border-transparent text-[hsl(var(--muted-foreground))]'"
                      >
                        <UIcon name="i-heroicons-cube-transparent" class="w-4 h-4" />
                        3D
                      </button>
                   
                      <button 
                        @click="showAxes = !showAxes"
                        class="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all text-[10px]"
                        :class="showAxes ? 'bg-[hsl(var(--primary)/0.1)] border-[hsl(var(--primary)/0.3)] text-[hsl(var(--primary))] font-medium' : 'bg-[hsl(var(--secondary)/0.5)] border-transparent text-[hsl(var(--muted-foreground))]'"
                      >
                        <UIcon name="i-heroicons-squares-plus" class="w-4 h-4" />
                        Assi
                      </button>
                </div>
            </div>
            
            <!-- Dynamic Legend -->
             <div class="pt-4 border-t border-[hsl(var(--border))]">
                 <!-- PROJECTS LEGEND -->
                 <template v-if="colorBy === 'project'">
                    <div class="flex items-center justify-between mb-2">
                    <h3 class="font-bold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Progetti</h3>
                    <div class="flex gap-1 text-[9px]">
                        <button @click="showAllProjectsVisibility" class="text-[hsl(var(--primary))] hover:underline">Tutti</button>
                        <span class="text-[hsl(var(--muted-foreground))]">/</span>
                        <button @click="hideAllProjectsVisibility" class="text-[hsl(var(--primary))] hover:underline">Nessuno</button>
                    </div>
                    </div>
                    <div class="space-y-1 max-h-40 overflow-y-auto pr-1">
                    <button 
                        v-for="project in analytics.mapData.value?.projects" 
                        :key="project.id"
                        @click="toggleProjectVisibility(project.id)"
                        class="w-full px-2 py-1.5 rounded flex justify-between items-center text-xs transition-colors hover:bg-[hsl(var(--accent))]"
                        :class="visibleProjects.has(project.id) ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] opacity-50'"
                    >
                        <span class="flex items-center gap-2 truncate">
                        <UIcon 
                            :name="visibleProjects.has(project.id) ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'" 
                            class="w-3.5 h-3.5 flex-shrink-0"
                        />
                        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: getProjectColor(project.id) }"></span>
                        <span class="truncate">{{ project.name || project.code }}</span>
                        </span>
                    </button>
                    </div>
                 </template>
                 
                 <!-- Other Legends (simplified for brevity, similar logic) -->
                 <!-- WBS06 -->
                 <template v-else-if="colorBy === 'wbs06'">
                     <!-- Render WBS06 list similarly -->
                     <div class="text-xs text-muted-foreground">Legenda WBS06 ({{ uniqueWbs6Categories.length }} cat)</div>
                 </template>
             </div>
          </div>

          <!-- Section: Advanced -->
          <div class="pt-4 border-t border-[hsl(var(--border))]">
             <UButton 
                block 
                size="xs"
                color="gray" 
                variant="ghost"
                class="justify-between group"
                @click="showAdvanced = !showAdvanced"
             >
                <span class="text-[hsl(var(--muted-foreground))] text-[10px] uppercase font-bold tracking-wider">Avanzate</span>
                <UIcon :name="showAdvanced ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="text-[hsl(var(--muted-foreground))]" />
             </UButton>
             
             <div v-show="showAdvanced" class="mt-3 space-y-3">
                 <!-- Analysis Params -->
                 <div v-if="activeTab === 'analysis'" class="space-y-3">
                    <UFormGroup label="Top K Neighbors" size="xs">
                        <input type="range" v-model.number="analytics.analysisParams.topK" min="10" max="50" step="5" class="w-full accent-primary h-1.5 bg-gray-200 rounded-lg cursor-pointer" />
                        <div class="text-right text-[10px] text-muted-foreground">{{ analytics.analysisParams.topK }}</div>
                    </UFormGroup>
                 </div>

                 <UButton 
                  block 
                  size="xs"
                  variant="outline" 
                  color="warning" 
                  icon="i-heroicons-cpu-chip"
                  :loading="analytics.isComputingMap.value"
                  @click="triggerComputeMap" 
                >
                  Ricalcola UMAP
                </UButton>
             </div>
          </div>
          
        </div>
        
        <!-- Resize Handle -->
         <div 
            @mousedown="startResize"
            class="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-[hsl(var(--primary))] transition-colors z-10 opacity-0 hover:opacity-100"
         ></div>
      </aside>

      <!-- Main Chart Area -->
      <main class="flex-1 relative min-h-0 bg-[hsl(var(--card))/0.3] border border-[hsl(var(--border))] rounded-xl overflow-hidden shadow-sm">
        
        <!-- Loading Overlay -->
        <div v-if="analytics.isLoadingMap.value" class="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20">
            <div class="flex flex-col items-center gap-3">
                <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-[hsl(var(--primary))] animate-spin" />
                <span class="text-sm font-medium">Caricamento mappa...</span>
            </div>
        </div>

        <!-- Map - absolute fill -->
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

        <!-- Hover Info (Floating Card) -->
        <transition 
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-2"
        >
            <div v-if="hoveredPoint" class="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-[hsl(var(--card))] shadow-xl rounded-lg border border-[hsl(var(--border))] p-3 flex items-center gap-4 min-w-[300px]">
                <div class="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" :style="{ backgroundColor: getProjectColor(hoveredPoint.project_id) }"></div>
                <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm truncate">{{ hoveredPoint.label }}</div>
                    <div class="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                        <span>{{ hoveredPoint.project_name }}</span>
                        <span>•</span>
                        <span class="font-mono">{{ hoveredPoint.code }}</span>
                    </div>
                </div>
                <div v-if="hoveredPoint.price" class="text-right">
                    <div class="text-sm font-bold text-green-600 dark:text-green-400">{{ formatCurrency(hoveredPoint.price) }}</div>
                </div>
            </div>
        </transition>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGlobalAnalytics, type GlobalPoint } from '~/composables/useGlobalAnalytics';

const analytics = useGlobalAnalytics();
const toast = useToast();

// Computed Subtitle for PageHeader
const analyticsSubtitle = computed(() => {
   const pts = visibilityFilteredPoints.value.length.toLocaleString();
   const pls = poles.value.length;
   const projects = analytics.mapData.value?.projects?.length || 0;
   return `${pts} punti · ${pls} poli · ${projects} progetti`;
});

// UI State
const activeTab = ref<'explore' | 'analysis'>('explore');
const hoveredPoint = ref<GlobalPoint | null>(null);
const colorBy = ref<'project' | 'cluster' | 'amount' | 'wbs06'>('project');
const showAdvanced = ref(false);

// Map controls
const pointSize = ref(6);
const is3D = ref(false);
const showAxes = ref(false);

// Analysis UI state
const showAllCategories = ref(false);
const selectedCategory = ref<string | null>(null);
const showAllOutliers = ref(false);
const selectedOutlier = ref<string | null>(null);

// Local filter refs (USelectMenu needs object selections)
const selectedProjects = ref<{label: string, value: string}[]>([]);
const selectedYear = ref<{label: string, value: number | null} | null>(null);
const selectedBU = ref<{label: string, value: string | null} | null>(null);

// Poles Integration
const poles = ref<any[]>([]);
const showPoles = ref(true);

// Reset Filters Action
const resetFilters = () => {
    selectedProjects.value = [];
    selectedYear.value = null;
    selectedBU.value = null;
    analytics.fetchMapData();
};

// ========== RESIZABLE SIDEBAR ==========
const sidebarRef = ref<HTMLElement | null>(null);
const sidebarWidth = ref(300); // Default width
const isResizing = ref(false);
const resizeStartX = ref(0);
const resizeStartWidth = ref(0);

function startResize(e: MouseEvent) {
  isResizing.value = true;
  resizeStartX.value = e.clientX;
  resizeStartWidth.value = sidebarWidth.value;
  document.body.style.cursor = 'ew-resize';
  document.body.style.userSelect = 'none';
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
  e.preventDefault();
}

function handleResize(e: MouseEvent) {
  if (!isResizing.value) return;
  const deltaX = e.clientX - resizeStartX.value;
  const newWidth = resizeStartWidth.value + deltaX;
  if (newWidth >= 240 && newWidth <= 500) {
    sidebarWidth.value = newWidth;
  }
}

function stopResize() {
  isResizing.value = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
}

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
});

// ========== VISIBILITY TOGGLES ==========
const visibleProjects = ref<Set<string>>(new Set());
const visibleWbs6 = ref<Set<string>>(new Set());
const visibleClusters = ref<Set<number>>(new Set());

// Compute unique WBS6 categories
const uniqueWbs6Categories = computed(() => {
  const map = new Map<string, { code: string; desc: string; count: number }>();
  analytics.points.value.forEach(p => {
    const desc = p.wbs06_desc || p.wbs06 || 'N/A';
    const existing = map.get(desc);
    if (existing) {
      existing.count++;
    } else {
      map.set(desc, { code: desc, desc: desc, count: 1 });
    }
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
});

// Compute unique clusters
const uniqueClusters = computed(() => {
  const map = new Map<number, { id: number; count: number }>();
  analytics.points.value.forEach(p => {
    const cluster = p.cluster ?? -1;
    const existing = map.get(cluster);
    if (existing) {
      existing.count++;
    } else {
      map.set(cluster, { id: cluster, count: 1 });
    }
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
});

// Initialize visibility sets
watch(() => analytics.mapData.value, (data) => {
  if (data?.projects) {
    visibleProjects.value = new Set(data.projects.map(p => p.id));
  }
}, { immediate: true });

watch(() => analytics.points.value, (points) => {
  if (points.length > 0) {
    const wbs6Descs = new Set(points.map(p => p.wbs06_desc || p.wbs06 || 'N/A'));
    visibleWbs6.value = wbs6Descs;
    const clusterIds = new Set(points.map(p => p.cluster ?? -1));
    visibleClusters.value = clusterIds;
  }
}, { immediate: true });

// Toggle functions
function toggleProjectVisibility(projectId: string) {
  const newSet = new Set(visibleProjects.value);
  if (newSet.has(projectId)) newSet.delete(projectId);
  else newSet.add(projectId);
  visibleProjects.value = newSet;
}

function toggleWbs6Visibility(wbs6Code: string) {
  const newSet = new Set(visibleWbs6.value);
  if (newSet.has(wbs6Code)) newSet.delete(wbs6Code);
  else newSet.add(wbs6Code);
  visibleWbs6.value = newSet;
}

function toggleClusterVisibility(clusterId: number) {
  const newSet = new Set(visibleClusters.value);
  if (newSet.has(clusterId)) newSet.delete(clusterId);
  else newSet.add(clusterId);
  visibleClusters.value = newSet;
}

// Select all / none
function showAllProjectsVisibility() {
  const projects = analytics.mapData.value?.projects ?? [];
  visibleProjects.value = new Set(projects.map(p => p.id));
}
function hideAllProjectsVisibility() {
  visibleProjects.value = new Set();
}
function showAllWbs6Visibility() {
  visibleWbs6.value = new Set(uniqueWbs6Categories.value.map(w => w.code));
}
function hideAllWbs6Visibility() {
  visibleWbs6.value = new Set();
}
function showAllClustersVisibility() {
  visibleClusters.value = new Set(uniqueClusters.value.map(c => c.id));
}
function hideAllClustersVisibility() {
  visibleClusters.value = new Set();
}

// Visibility-filtered points
const visibilityFilteredPoints = computed(() => {
  return analytics.filteredPoints.value.filter(p => {
    return visibleProjects.value.has(p.project_id) && 
           visibleWbs6.value.has(p.wbs06_desc || p.wbs06 || 'N/A') &&
           visibleClusters.value.has(p.cluster ?? -1);
  });
});

const fetchPoles = async () => {
    try {
        const { poles: fetchedPoles } = await $fetch<any>('/api/analytics/global-map', {
            method: 'POST',
            body: { 
              project_ids: selectedProjects.value.length > 0 ? selectedProjects.value.map(p => p.value) : undefined 
            }
        });
        poles.value = fetchedPoles || [];
        toast.add({ title: 'Poli Aggiornati', description: `Visualizzati ${poles.value.length} poli.`, color: 'green', timeout: 2000 });
    } catch (e) {
        console.error("Failed to fetch poles", e);
    }
};

onMounted(() => {
    setTimeout(fetchPoles, 1000);
});

watch(showPoles, (val) => {
    if (val && poles.value.length === 0) fetchPoles();
});

watch(selectedProjects, (val) => {
  if (showPoles.value) fetchPoles();
  analytics.filters.projectIds = val.map(p => p.value);
}, { deep: true });

watch(selectedYear, (val) => {
  analytics.filters.year = val?.value ?? null;
});

watch(selectedBU, (val) => {
  analytics.filters.businessUnit = val?.value ?? null;
});

const projectOptions = computed(() => 
  analytics.availableProjects.value.map(p => ({
    label: p.name || p.code,
    value: p.id
  }))
);

const yearOptions = computed(() => 
  [{ label: 'Tutti gli anni', value: null }, ...analytics.availableYears.value.map(y => ({
    label: String(y),
    value: y
  }))]
);

const buOptions = computed(() => 
  [{ label: 'Tutte le BU', value: null }, ...analytics.availableBusinessUnits.value.map(bu => ({
    label: bu,
    value: bu
  }))]
);

const colorByOptions = [
  { label: 'Progetto', value: 'project' },
  { label: 'Cluster', value: 'cluster' },
  { label: 'Prezzo', value: 'amount' },
  { label: 'WBS06', value: 'wbs06' },
];

// Palettes
const wbs06Palette = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#10b981', '#f43f5e', '#0ea5e9',
  '#78716c', '#ea580c', '#65a30d', '#0891b2', '#7c3aed',
  '#db2777', '#0284c7', '#4d7c0f', '#dc2626', '#9333ea',
  '#059669', '#d97706', '#2563eb', '#c026d3', '#16a34a'
];

const wbs06ColorMap = computed(() => {
  const map = new Map<string, string>();
  const uniqueWbs = [...new Set(analytics.points.value.map(p => p.wbs06_desc || p.wbs06 || 'N/A'))];
  uniqueWbs.sort().forEach((wbs, idx) => {
    map.set(wbs, wbs06Palette[idx % wbs06Palette.length]);
  });
  return map;
});

function getWbs06Color(wbs06: string): string {
  return wbs06ColorMap.value.get(wbs06 || 'N/A') || wbs06Palette[0];
}

const projectPalette = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#10b981', '#f43f5e', '#0ea5e9'
];

function getProjectColor(projectId: string): string {
  const projects = analytics.availableProjects.value;
  const idx = projects.findIndex(p => p.id === projectId);
  if (idx < 0) return projectPalette[0];
  return projectPalette[idx % projectPalette.length];
}

function getProjectPointCount(projectId: string): number {
  return analytics.points.value.filter(p => p.project_id === projectId).length;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value);
}

const clusterPalette = [
  '#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ef4444',
  '#14b8a6', '#eab308', '#ec4899', '#0ea5e9', '#f59e0b',
  '#10b981', '#6366f1', '#d946ef', '#84cc16', '#06b6d4',
  '#f43f5e', '#8b5cf6', '#64748b'
];

function getClusterColor(clusterId: number): string {
  if (clusterId < 0) return '#888888';
  return clusterPalette[clusterId % clusterPalette.length];
}

const plotData = computed(() => {
  const pts = visibilityFilteredPoints.value;
  if (pts.length === 0) return [];

  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);

  let colors: (string | number)[];
  let colorscale: string | undefined;
  let showColorbar = false;

  if (colorBy.value === 'project') {
    colors = pts.map(p => getProjectColor(p.project_id));
  } else if (colorBy.value === 'cluster') {
    colors = pts.map(p => getClusterColor(p.cluster ?? -1));
  } else if (colorBy.value === 'wbs06') {
    colors = pts.map(p => getWbs06Color(p.wbs06_desc || p.wbs06));
  } else {
    colors = pts.map(p => p.price ?? 0);
    colorscale = 'Viridis';
    showColorbar = true;
  }

  const outlierSet = analytics.outlierIds.value;
  const sizes = pts.map(p => outlierSet.has(p.id) ? pointSize.value * 1.8 : pointSize.value);

  const marker: any = {
    size: sizes,
    opacity: 0.85,
    color: colors,
    sizemode: 'diameter',
    line: { width: 0 },
  };

  if (colorscale) {
    marker.colorscale = colorscale;
    if (showColorbar) {
      marker.colorbar = { 
        thickness: 12, len: 0.4, bgcolor: 'rgba(0,0,0,0)', borderwidth: 0,
        tickfont: { size: 10, color: '#888' },
        title: { text: colorBy.value === 'amount' ? 'Prezzo €' : 'Cluster', font: { size: 11 } }
      };
    }
  }

  const mainTrace: any = {
      x: xs, y: ys, customdata: pts, hoverinfo: 'none', marker
  };

  if (is3D.value) {
      mainTrace.type = 'scatter3d'; mainTrace.mode = 'markers';
      mainTrace.z = pts.map(p => p.z ?? 0);
  } else {
      mainTrace.type = 'scattergl'; mainTrace.mode = 'markers';
  }

  const traces: any[] = [mainTrace];

  if (showPoles.value && poles.value.length > 0) {
      const p = poles.value;
      const px = p.map(pt => pt.x);
      const py = p.map(pt => pt.y);
      const plabels = p.map(pt => pt.description ? pt.description : `Polo ${pt.wbs6}`);
      
      const poleMarker = {
          size: pointSize.value * 2, 
          symbol: is3D.value ? 'diamond' : 'star',
          color: '#ffd700', opacity: 1.0
      };

      const commonPoleTrace = {
          x: px, y: py, text: plabels, mode: 'markers+text',
          textposition: 'top center', textfont: { size: 11, color: '#000' },
          marker: poleMarker, name: 'Poles', hoverinfo: 'none',
      };

      if (is3D.value) {
          const pz = p.map(pt => pt.z ?? 0);
          traces.push({ ...commonPoleTrace, type: 'scatter3d', z: pz, mode: 'markers', hoverinfo: 'text', hoverlabel: { bgcolor: '#FFF', bordercolor: '#ffd700' } });
      } else {
          traces.push({ ...commonPoleTrace, type: 'scatter' });
      }
  }
  return traces;
});

const plotLayout = computed(() => {
  const axisConfig = {
    visible: showAxes.value, showgrid: showAxes.value, zeroline: false, showticklabels: showAxes.value, autorange: true,
  };
  const margin = showAxes.value ? { l: 50, r: 20, b: 40, t: 20 } : { l: 0, r: 0, b: 0, t: 0 };

  const common = {
      margin, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
      showlegend: false, uirevision: 'true', hovermode: 'closest'
  };

  if (is3D.value) {
    return { ...common, scene: { xaxis: axisConfig, yaxis: axisConfig, zaxis: axisConfig, bgcolor: 'rgba(0,0,0,0)' } };
  }
  return { ...common, dragmode: 'pan', xaxis: axisConfig, yaxis: axisConfig, autosize: true };
});

const displayedCategories = computed(() => {
  const cats = analytics.analysisResult.value?.categories ?? [];
  return showAllCategories.value ? cats : cats.slice(0, 5);
});

function getSeverityClasses(severity?: string): string {
  switch (severity) {
    case 'high': return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/40';
    case 'medium': return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 hover:bg-orange-200 dark:hover:bg-orange-900/40';
    default: return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-200 dark:hover:bg-yellow-900/40';
  }
}

const plotConfig = {
  responsive: true, displayModeBar: 'hover', displaylogo: false, scrollZoom: true,
  modeBarButtonsToRemove: ['toImage', 'sendDataToCloud']
};

function onPointClick(data: any) {
  if (!data?.points?.[0]) return;
  const point = data.points[0].customdata as GlobalPoint;
  toast.add({ title: point.code, description: `${point.label} - ${point.project_name}`, color: 'info' });
}

function onPointHover(data: any) {
  if (!data?.points?.[0]) return;
  hoveredPoint.value = data.points[0].customdata as GlobalPoint;
}

function onPointUnhover() {
  hoveredPoint.value = null;
}

async function runPriceAnalysis() {
  await analytics.runAnalysis();
  if (analytics.analysisResult.value) {
    toast.add({
      title: 'Analisi completata',
      description: `${analytics.analysisResult.value.outliers_found} outlier trovati su ${analytics.analysisResult.value.total_items} voci`,
      color: analytics.analysisResult.value.outliers_found > 0 ? 'warning' : 'success'
    });
  }
}

function navigateToPoint(itemId: string) {
  const point = analytics.points.value.find(p => p.id === itemId);
  if (point) toast.add({ title: 'Outlier', description: `${point.code}: ${point.label}`, color: 'warning' });
}

async function triggerComputeMap() {
  const result = await analytics.computeMap();
  if (result) {
    toast.add({ title: 'Calcolo UMAP avviato', description: `Background job started for ${result.project_count || 'N'} projects.`, color: 'success' });
  } else if (analytics.mapError.value) {
    toast.add({ title: 'Errore', description: analytics.mapError.value, color: 'error' });
  }
}
</script>
