<template>
  <div class="absolute inset-0 flex overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
    <!-- Global Analytics Page -->
    
    <!-- Sidebar - Card Style -->
    <div class="w-80 flex-shrink-0 flex flex-col m-4 mr-0 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm overflow-hidden">
      
      <!-- Header -->
      <div class="p-4 border-b border-[hsl(var(--border))]">
        <h2 class="font-bold text-base mb-0.5">Analytics Globale</h2>
        <p class="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
          {{ analytics.filteredPoints.value.length.toLocaleString() }} punti
          <span v-if="analytics.mapData.value?.projects.length">
            da {{ analytics.mapData.value.projects.length }} progetti
          </span>
        </p>
      </div>

      <!-- Filters -->
      <div class="p-3 border-b border-[hsl(var(--border))] space-y-3">
        <h3 class="font-bold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Filtri</h3>
        
        <!-- Project Filter -->
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
        
        <!-- Year Filter -->
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
        
        <!-- Business Unit Filter -->
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
        
        <!-- Apply Filters Button -->
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
        
        <!-- Compute Map Button -->
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

      <!-- Tab Switch -->
      <div class="flex border-b border-[hsl(var(--border))]">
        <button 
          @click="activeTab = 'explore'"
          :class="['flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors', 
            activeTab === 'explore' ? 'border-b-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]']"
        >
          <UIcon name="i-heroicons-magnifying-glass" class="w-3.5 h-3.5" />
          Esplora
        </button>
        <button 
          @click="activeTab = 'analysis'"
          :class="['flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors', 
            activeTab === 'analysis' ? 'border-b-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]']"
        >
          <UIcon name="i-heroicons-chart-bar" class="w-3.5 h-3.5" />
          Analisi
          <span v-if="analytics.analysisResult.value?.outliers_found" class="bg-red-500 text-white text-[9px] px-1 rounded-full">
            {{ analytics.analysisResult.value.outliers_found }}
          </span>
        </button>
      </div>

      <!-- EXPLORE TAB -->
      <template v-if="activeTab === 'explore'">
        <!-- Color By -->
        <div class="p-3 border-b border-[hsl(var(--border))]">
          <label class="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase mb-2 block">Colora per</label>
          <USelectMenu
            v-model="colorBy"
            :items="colorByOptions"
            value-key="value"
            class="w-full"
          />
        </div>

        <!-- Map Controls -->
        <div class="p-3 border-b border-[hsl(var(--border))] space-y-3">
          <!-- Point Size -->
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
          
          <!-- 3D Toggle -->
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
          
          <!-- Show Axes -->
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

        <!-- Projects Legend -->
        <div class="flex-1 overflow-y-auto p-3">
          <h3 class="font-bold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Progetti</h3>
          <div class="space-y-1">
            <div 
              v-for="project in analytics.mapData.value?.projects" 
              :key="project.id"
              class="px-2 py-1.5 rounded flex justify-between items-center text-xs text-[hsl(var(--muted-foreground))]"
            >
              <span class="flex items-center gap-2 truncate">
                <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: getProjectColor(project.id) }"></span>
                <span class="truncate">{{ project.name || project.code }}</span>
              </span>
              <span class="text-[10px] opacity-60">{{ getProjectPointCount(project.id) }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- ANALYSIS TAB -->
      <template v-if="activeTab === 'analysis'">
        <div class="flex-1 overflow-y-auto p-3 space-y-4">
          <!-- Parameters -->
          <div class="space-y-3">
            <h3 class="font-bold text-[10px] uppercase tracking-wider text-gray-400">Parametri</h3>
            
            <!-- Top K -->
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-[10px] text-gray-500">Top K Neighbors</label>
                <span class="text-[10px] font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">{{ analytics.analysisParams.topK }}</span>
              </div>
              <input 
                type="range" 
                v-model.number="analytics.analysisParams.topK" 
                min="10" max="50" step="5"
                class="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 accent-primary-500"
              />
            </div>
            
            <!-- Min Similarity -->
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-[10px] text-gray-500">Min Similarity</label>
                <span class="text-[10px] font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">{{ analytics.analysisParams.minSimilarity.toFixed(2) }}</span>
              </div>
              <input 
                type="range" 
                v-model.number="analytics.analysisParams.minSimilarity" 
                min="0.3" max="0.9" step="0.05"
                class="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 accent-primary-500"
              />
            </div>
            
            <!-- MAD Threshold -->
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-[10px] text-gray-500">MAD Threshold</label>
                <span class="text-[10px] font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">{{ analytics.analysisParams.madThreshold }}</span>
              </div>
              <input 
                type="range" 
                v-model.number="analytics.analysisParams.madThreshold" 
                min="1" max="4" step="0.5"
                class="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 accent-primary-500"
              />
            </div>
            
            <!-- Run Button -->
            <UButton 
              block 
              color="primary" 
              @click="runPriceAnalysis" 
              :loading="analytics.isLoadingAnalysis.value"
              icon="i-heroicons-play"
            >
              Esegui Analisi
            </UButton>
          </div>
          
          <!-- Results Summary -->
          <div v-if="analytics.analysisResult.value" class="bg-[hsl(var(--accent))] rounded-lg p-3 space-y-2">
            <h4 class="font-bold text-[10px] uppercase text-[hsl(var(--muted-foreground))]">Riepilogo</h4>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div><span class="text-[hsl(var(--muted-foreground))]">Voci:</span> <span class="font-bold">{{ analytics.analysisResult.value.total_items }}</span></div>
              <div><span class="text-[hsl(var(--muted-foreground))]">Categorie WBS6:</span> <span class="font-bold">{{ analytics.analysisResult.value.categories_analyzed }}</span></div>
              <div class="col-span-2 flex items-center gap-2">
                <span class="text-[hsl(var(--muted-foreground))]">Outliers:</span> 
                <span class="font-bold text-red-500">{{ analytics.analysisResult.value.outliers_found }}</span>
                <span class="text-[hsl(var(--muted-foreground))]">({{ analytics.outlierPercent.value }}%)</span>
              </div>
            </div>
          </div>
          
          <!-- Category Analysis -->
          <div v-if="analytics.analysisResult.value?.categories?.length" class="space-y-2">
            <div class="flex justify-between items-center">
              <h4 class="font-bold text-[10px] uppercase text-[hsl(var(--muted-foreground))]">Categorie WBS6</h4>
              <button 
                @click="showAllCategories = !showAllCategories"
                class="text-[10px] text-[hsl(var(--primary))] hover:underline"
              >
                {{ showAllCategories ? 'Mostra meno' : `Mostra tutte (${analytics.analysisResult.value.categories.length})` }}
              </button>
            </div>
            
            <div class="space-y-1.5 max-h-48 overflow-y-auto">
              <div 
                v-for="cat in displayedCategories" 
                :key="cat.wbs6_code"
                class="p-2 rounded-lg bg-[hsl(var(--secondary))] text-xs cursor-pointer hover:bg-[hsl(var(--accent))] transition-colors"
                @click="selectedCategory = selectedCategory === cat.wbs6_code ? null : cat.wbs6_code"
              >
                <div class="flex justify-between items-start">
                  <div class="flex-1 min-w-0">
                    <div class="font-mono font-medium text-[hsl(var(--primary))]">{{ cat.wbs6_code }}</div>
                    <div class="text-[hsl(var(--muted-foreground))] truncate text-[10px]">{{ cat.wbs6_description }}</div>
                  </div>
                  <div class="text-right flex-shrink-0 ml-2">
                    <div class="font-bold">{{ cat.item_count }} voci</div>
                    <div v-if="cat.outlier_count > 0" class="text-red-500 text-[10px]">{{ cat.outlier_count }} outlier</div>
                  </div>
                </div>
                
                <!-- Expanded Category Stats -->
                <div v-if="selectedCategory === cat.wbs6_code && cat.stats" class="mt-2 pt-2 border-t border-[hsl(var(--border))] grid grid-cols-3 gap-1 text-[10px]">
                  <div><span class="text-[hsl(var(--muted-foreground))]">Media:</span> {{ formatCurrency(cat.stats.mean) }}</div>
                  <div><span class="text-[hsl(var(--muted-foreground))]">Mediana:</span> {{ formatCurrency(cat.stats.median) }}</div>
                  <div><span class="text-[hsl(var(--muted-foreground))]">MAD:</span> {{ formatCurrency(cat.stats.mad) }}</div>
                  <div><span class="text-[hsl(var(--muted-foreground))]">Min:</span> {{ formatCurrency(cat.stats.min) }}</div>
                  <div><span class="text-[hsl(var(--muted-foreground))]">Max:</span> {{ formatCurrency(cat.stats.max) }}</div>
                  <div><span class="text-[hsl(var(--muted-foreground))]">Std:</span> {{ formatCurrency(cat.stats.std) }}</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Outlier List -->
          <div v-if="analytics.outlierItems.value.length > 0" class="space-y-2">
            <h4 class="font-bold text-[10px] uppercase text-[hsl(var(--muted-foreground))]">
              Outliers Rilevati ({{ analytics.outlierItems.value.length }})
            </h4>
            <div class="space-y-1.5 max-h-80 overflow-y-auto">
              <div 
                v-for="item in analytics.outlierItems.value.slice(0, showAllOutliers ? 50 : 5)" 
                :key="item.item_id"
                class="rounded-lg text-xs transition-colors border overflow-hidden"
                :class="getSeverityClasses(item.outlier_severity)"
              >
                <button 
                  @click="selectedOutlier = selectedOutlier === item.item_id ? null : item.item_id"
                  class="w-full text-left p-2.5"
                >
                  <div class="flex justify-between items-start">
                    <div class="flex-1 min-w-0">
                      <div class="font-mono font-medium flex items-center gap-1">
                        {{ item.code }}
                        <UIcon 
                          :name="selectedOutlier === item.item_id ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" 
                          class="w-3 h-3 text-[hsl(var(--muted-foreground))]"
                        />
                      </div>
                      <div class="text-[hsl(var(--muted-foreground))] truncate text-[10px] mt-0.5">{{ item.description }}</div>
                    </div>
                    <div class="text-right flex-shrink-0 ml-2">
                      <div :class="(item.delta || 0) > 0 ? 'text-red-600' : 'text-green-600'" class="font-bold">
                        {{ (item.delta || 0) > 0 ? '+' : '' }}{{ ((item.delta || 0) * 100).toFixed(0) }}%
                      </div>
                      <div class="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {{ formatCurrency(item.actual_price) }} vs {{ formatCurrency(item.estimated_price) }}
                      </div>
                    </div>
                  </div>
                  <div v-if="item.outlier_reason" class="mt-1 text-[10px] text-[hsl(var(--muted-foreground))] italic">
                    {{ item.outlier_reason }}
                  </div>
                </button>
                
                <!-- KNN Neighbors Panel -->
                <div 
                  v-if="selectedOutlier === item.item_id && item.top_neighbors?.length" 
                  class="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 space-y-1.5"
                >
                  <div class="flex items-center gap-1 text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase mb-1">
                    <UIcon name="i-heroicons-users" class="w-3 h-3" />
                    {{ item.neighbors_count }} vicini WBS06 (top {{ item.top_neighbors.length }})
                  </div>
                  <div 
                    v-for="neighbor in item.top_neighbors" 
                    :key="neighbor.item_id"
                    class="p-1.5 rounded bg-[hsl(var(--secondary))] flex justify-between items-center"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="font-mono text-[10px]">{{ neighbor.code }}</div>
                      <div class="text-[9px] text-[hsl(var(--muted-foreground))] truncate">{{ neighbor.description }}</div>
                    </div>
                    <div class="text-right flex-shrink-0 ml-2 text-[10px]">
                      <div class="font-medium">{{ formatCurrency(neighbor.price) }}</div>
                      <div class="text-[hsl(var(--primary))]">{{ (neighbor.similarity * 100).toFixed(0) }}% sim</div>
                    </div>
                  </div>
                </div>
                
                <!-- No neighbors message -->
                <div 
                  v-else-if="selectedOutlier === item.item_id && (!item.top_neighbors || item.top_neighbors.length === 0)" 
                  class="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 text-[10px] text-[hsl(var(--muted-foreground))] italic"
                >
                  Nessun vicino trovato con similarità >= {{ (analytics.analysisParams.minSimilarity * 100).toFixed(0) }}%
                </div>
              </div>
            </div>
            <button 
              v-if="analytics.outlierItems.value.length > 5"
              @click="showAllOutliers = !showAllOutliers"
              class="w-full text-center text-[10px] text-[hsl(var(--primary))] hover:underline py-1"
            >
              {{ showAllOutliers ? 'Mostra meno' : `Mostra tutti (${analytics.outlierItems.value.length})` }}
            </button>
          </div>
          
          <!-- Error -->
          <div v-if="analytics.analysisError.value" class="bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg p-3 text-xs">
            {{ analytics.analysisError.value }}
          </div>
        </div>
      </template>
    </div>

    <!-- Main Chart Area -->
    <div class="flex-1 relative flex flex-col h-full bg-slate-50 dark:bg-slate-950/50">
      
      <!-- Loading Overlay -->
      <div v-if="analytics.isLoadingMap.value" class="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center z-20">
        <div class="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow-lg">
          <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-primary-500 animate-spin" />
          <span class="text-sm font-medium">Caricamento mappa...</span>
        </div>
      </div>

      <!-- Map -->
      <ClientOnly>
        <SemanticMap 
          :data="plotData" 
          :layout="plotLayout"
          :config="plotConfig"
          @click="onPointClick"
          @hover="onPointHover"
          @unhover="onPointUnhover"
          class="w-full h-full"
        />
      </ClientOnly>

      <!-- Hover Info -->
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
import { useGlobalAnalytics, type GlobalPoint } from '~/composables/useGlobalAnalytics';

const analytics = useGlobalAnalytics();
const toast = useToast();

// UI State
const activeTab = ref<'explore' | 'analysis'>('explore');
const hoveredPoint = ref<GlobalPoint | null>(null);
const colorBy = ref<'project' | 'cluster' | 'amount' | 'wbs06'>('project');

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

// Sync local selections to analytics filters
watch(selectedProjects, (val) => {
  analytics.filters.projectIds = val.map(p => p.value);
}, { deep: true });

watch(selectedYear, (val) => {
  analytics.filters.year = val?.value ?? null;
});

watch(selectedBU, (val) => {
  analytics.filters.businessUnit = val?.value ?? null;
});

// Filter options for USelectMenu
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

// WBS06 color palette (larger palette for many categories)
const wbs06Palette = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#10b981', '#f43f5e', '#0ea5e9',
  '#78716c', '#ea580c', '#65a30d', '#0891b2', '#7c3aed',
  '#db2777', '#0284c7', '#4d7c0f', '#dc2626', '#9333ea',
  '#059669', '#d97706', '#2563eb', '#c026d3', '#16a34a'
];

// Map WBS06 codes to colors
const wbs06ColorMap = computed(() => {
  const map = new Map<string, string>();
  const uniqueWbs = [...new Set(analytics.points.value.map(p => p.wbs06 || 'N/A'))];
  uniqueWbs.sort().forEach((wbs, idx) => {
    map.set(wbs, wbs06Palette[idx % wbs06Palette.length]);
  });
  return map;
});

function getWbs06Color(wbs06: string): string {
  return wbs06ColorMap.value.get(wbs06 || 'N/A') || wbs06Palette[0];
}

// Color palette for projects
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

// Plotly data
const plotData = computed(() => {
  const pts = analytics.filteredPoints.value;
  if (pts.length === 0) return [];

  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);
  const ids = pts.map(p => p.id);

  let colors: (string | number)[];
  let colorscale: string | undefined;
  let showColorbar = false;

  if (colorBy.value === 'project') {
    colors = pts.map(p => getProjectColor(p.project_id));
  } else if (colorBy.value === 'cluster') {
    colors = pts.map(p => p.cluster);
    colorscale = 'Viridis';
    showColorbar = true;
  } else if (colorBy.value === 'wbs06') {
    colors = pts.map(p => getWbs06Color(p.wbs06));
  } else {
    colors = pts.map(p => p.price ?? 0);
    colorscale = 'Viridis';
    showColorbar = true;
  }

  // Highlight outliers with larger size
  const outlierSet = analytics.outlierIds.value;
  const sizes = pts.map(p => outlierSet.has(p.id) ? pointSize.value * 1.5 : pointSize.value);

  const marker: any = {
    size: sizes,
    opacity: 0.8,
    color: colors,
  };

  if (colorscale) {
    marker.colorscale = colorscale;
    if (showColorbar) {
      marker.colorbar = { thickness: 15, len: 0.5 };
    }
  }

  // 2D or 3D
  if (is3D.value) {
    const zs = pts.map(p => p.z ?? 0);
    return [{
      type: 'scatter3d',
      mode: 'markers',
      x: xs,
      y: ys,
      z: zs,
      customdata: pts,
      hoverinfo: 'none',
      marker
    }];
  }

  return [{
    type: 'scattergl',
    mode: 'markers',
    x: xs,
    y: ys,
    customdata: pts,
    hoverinfo: 'none',
    marker
  }];
});

const plotLayout = computed(() => {
  const axisConfig = {
    visible: showAxes.value,
    showgrid: showAxes.value,
    zeroline: false,
    showticklabels: showAxes.value,
    autorange: true,
    constrain: 'domain' as const,
  };

  if (is3D.value) {
    return {
      margin: { l: 20, r: 20, b: 20, t: 20 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      showlegend: false,
      scene: {
        xaxis: { ...axisConfig },
        yaxis: { ...axisConfig },
        zaxis: { ...axisConfig },
        bgcolor: 'rgba(0,0,0,0)',
      },
      hovermode: 'closest'
    };
  }

  return {
    margin: { l: 20, r: 20, b: 20, t: 20 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    showlegend: false,
    dragmode: 'pan',
    xaxis: { ...axisConfig },
    yaxis: { ...axisConfig, scaleanchor: 'x', scaleratio: 1 },
    hovermode: 'closest',
    autosize: true
  };
});

// Categories for analysis display
const displayedCategories = computed(() => {
  const cats = analytics.analysisResult.value?.categories ?? [];
  return showAllCategories.value ? cats : cats.slice(0, 5);
});

// Severity classes for outliers
function getSeverityClasses(severity?: string): string {
  switch (severity) {
    case 'high':
      return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/40';
    case 'medium':
      return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 hover:bg-orange-200 dark:hover:bg-orange-900/40';
    default:
      return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-200 dark:hover:bg-yellow-900/40';
  }
}

const plotConfig = {
  responsive: true,
  displayModeBar: 'hover',
  displaylogo: false,
  modeBarButtonsToRemove: ['toImage', 'sendDataToCloud']
};

// Event handlers
function onPointClick(data: any) {
  if (!data?.points?.[0]) return;
  const point = data.points[0].customdata as GlobalPoint;
  // Could open detail panel here
  toast.add({
    title: point.code,
    description: `${point.label} - ${point.project_name}`,
    color: 'info'
  });
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
  if (point) {
    toast.add({
      title: 'Outlier',
      description: `${point.code}: ${point.label}`,
      color: 'warning'
    });
  }
}

async function triggerComputeMap() {
  const result = await analytics.computeMap();
  
  if (result) {
    toast.add({
      title: 'Calcolo UMAP avviato',
      description: `Elaborazione in background per ${result.project_count || 'N'} progetti. Ricarica la pagina tra qualche minuto.`,
      color: 'success'
    });
  } else if (analytics.mapError.value) {
    toast.add({
      title: 'Errore',
      description: analytics.mapError.value,
      color: 'error'
    });
  }
}
</script>
