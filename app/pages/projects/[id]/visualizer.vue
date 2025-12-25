<template>
  <!-- Root container -->
  <div class="absolute inset-0 m-4 rounded-xl flex overflow-hidden bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-800 shadow-sm text-slate-800 dark:text-slate-100">
    
    <!-- Sidebar (Minimal) -->
    <div class="w-64 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 backdrop-blur-sm">
      
      <!-- Header -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <div>
          <h2 class="font-bold text-base mb-0.5">Mappa Semantica</h2>
          <p class="text-[10px] text-gray-500 uppercase tracking-wider">{{ filteredPoints.length.toLocaleString() }} punti • {{ poles.length }} poli</p>
        </div>
        <!-- Settings Toggle -->
        <UPopover>
          <UButton icon="i-heroicons-cog-6-tooth" size="xs" variant="ghost" color="neutral" />
          <template #content>
            <div class="p-4 w-56 space-y-4">
              <h4 class="font-bold text-xs uppercase text-gray-500">Impostazioni</h4>
              
              <!-- View Mode -->
              <div class="space-y-2">
                <label class="text-xs text-gray-600 dark:text-gray-400">Modalità vista</label>
                <div class="bg-gray-200 dark:bg-gray-800 p-1 rounded-lg flex">
                  <button 
                    @click="setMode('2d')"
                    :class="['flex-1 py-1 px-2 rounded-md text-xs font-semibold transition-all', mode === '2d' ? 'bg-white dark:bg-gray-700 shadow text-primary-600' : 'text-gray-500']"
                  >2D</button>
                  <button 
                    @click="setMode('3d')"
                    :class="['flex-1 py-1 px-2 rounded-md text-xs font-semibold transition-all', mode === '3d' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600' : 'text-gray-500']"
                  >3D <span class="text-[9px] opacity-60">beta</span></button>
                </div>
              </div>
              
              <!-- Point Size -->
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <label class="text-xs text-gray-600 dark:text-gray-400">Dimensione punti</label>
                  <span class="text-xs font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">{{ pointSize }}px</span>
                </div>
                <input 
                  type="range" 
                  v-model.number="pointSize" 
                  min="2" max="20" step="1"
                  class="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 accent-primary-500"
                />
              </div>

              <!-- Show Poles Toggle -->
              <div class="flex items-center justify-between">
                <label class="text-xs text-gray-600 dark:text-gray-400">Mostra Poli</label>
                <UToggle v-model="showPoles" />
              </div>
              
              <!-- Manual Reload Button -->
               <UButton 
                  size="xs" 
                  block 
                  color="gray" 
                  variant="solid" 
                  icon="i-heroicons-arrow-path"
                  @click="fetchPoles"
                >
                  Ricarica Dati
                </UButton>
            </div>
          </template>
        </UPopover>
      </div>

      <!-- Tab Switch -->
      <div class="flex border-b border-gray-200 dark:border-gray-800">
        <button 
          @click="activeTab = 'explore'"
          :class="['flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors', 
            activeTab === 'explore' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500 hover:text-gray-700']"
        >
          <UIcon name="i-heroicons-magnifying-glass" class="w-3.5 h-3.5" />
          Esplora
        </button>
        <button 
          @click="activeTab = 'analysis'"
          :class="['flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors', 
            activeTab === 'analysis' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500 hover:text-gray-700']"
        >
          <UIcon name="i-heroicons-chart-bar" class="w-3.5 h-3.5" />
          Analisi
          <span v-if="priceAnalysis.analysisResult.value?.outliers_found" class="bg-red-500 text-white text-[9px] px-1 rounded-full">
            {{ priceAnalysis.analysisResult.value.outliers_found }}
          </span>
        </button>
      </div>

      <!-- EXPLORE TAB CONTENT -->
      <template v-if="activeTab === 'explore'">

      <!-- Search -->
      <div class="p-3 border-b border-gray-200 dark:border-gray-800">
        <div class="relative">
          <input 
            v-model="searchQuery" 
            @keydown.enter="handleSearch"
            type="text" 
            placeholder="Cerca..." 
            class="w-full pl-8 pr-2 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm focus:ring-2 focus:ring-primary-500 placeholder-gray-400"
          />
          <UIcon name="i-heroicons-magnifying-glass" class="absolute left-2.5 top-2.5 text-gray-400" />
        </div>
      </div>

      <!-- Color By -->
      <div class="p-3 border-b border-gray-200 dark:border-gray-800">
        <label class="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Colora per</label>
        <USelectMenu
          v-model="colorBy"
          :items="colorByOptions"
          value-key="value"
          class="w-full"
        />
      </div>

      <!-- Clusters (Compact) -->
      <div class="flex-1 overflow-y-auto p-3">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-[10px] uppercase tracking-wider text-gray-400">Clusters</h3>
          <button 
            v-if="clusters.length > 5" 
            @click="showAllClusters = !showAllClusters"
            class="text-[10px] text-primary-500 hover:underline"
          >
            {{ showAllClusters ? 'Mostra meno' : `+${clusters.length - 5} altri` }}
          </button>
        </div>
        <div class="space-y-1">
          <button 
            v-for="cluster in visibleClusters" 
            :key="cluster.id"
            @click="toggleCluster(cluster.id)"
            class="w-full text-left group"
          >
            <div :class="['px-2 py-1.5 rounded flex justify-between items-center text-xs transition-colors', 
                selectedCluster === cluster.id 
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400']"
            >
              <span class="flex items-center gap-2 truncate">
                <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: getClusterColor(cluster.id) }"></span>
                <span class="truncate">Cluster {{ cluster.id }}</span>
              </span>
              <span class="text-[10px] opacity-60 bg-gray-200 dark:bg-gray-700 px-1.5 rounded-full">{{ cluster.count }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Actions Section -->
      <div class="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 space-y-2">
        <h3 class="font-bold text-[10px] uppercase tracking-wider text-gray-400 mb-2">Azioni</h3>
        
        <UButton
          icon="i-heroicons-arrow-down-tray"
          size="xs"
          variant="soft"
          color="primary"
          block
          @click="handleExportCsv"
        >
          {{ analytics.selectedPointIds.value.size > 0 
            ? `Esporta selezione (${analytics.selectedPointIds.value.size})` 
            : 'Esporta tutti' }}
        </UButton>

        <UButton
          v-if="analytics.selectedPointIds.value.size > 0"
          icon="i-heroicons-clipboard-document"
          size="xs"
          variant="ghost"
          color="neutral"
          block
          @click="copySelectedIds"
        >
          Copia ID selezionati
        </UButton>

        <UButton 
          v-if="hasActiveFilters || hasZoomed || analytics.selectedPointIds.value.size > 0"
          icon="i-heroicons-arrow-path"
          size="xs"
          variant="ghost"
          color="neutral"
          block
          @click="resetView"
        >
          Reset vista
        </UButton>
      </div>
      </template>

      <!-- ANALYSIS TAB CONTENT -->
      <template v-if="activeTab === 'analysis'">
        <div class="flex-1 overflow-y-auto p-3 space-y-4">
          <!-- Parameters -->
          <div class="space-y-3">
            <h3 class="font-bold text-[10px] uppercase tracking-wider text-gray-400">Parametri</h3>
            
            <!-- Top K -->
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-[10px] text-gray-500">Top K Neighbors</label>
                <span class="text-[10px] font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">{{ priceAnalysis.params.topK }}</span>
              </div>
              <input 
                type="range" 
                v-model.number="priceAnalysis.params.topK" 
                min="10" max="50" step="5"
                class="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 accent-primary-500"
              />
            </div>
            
            <!-- Min Similarity -->
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-[10px] text-gray-500">Min Similarity</label>
                <span class="text-[10px] font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">{{ priceAnalysis.params.minSimilarity.toFixed(2) }}</span>
              </div>
              <input 
                type="range" 
                v-model.number="priceAnalysis.params.minSimilarity" 
                min="0.3" max="0.9" step="0.05"
                class="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 accent-primary-500"
              />
            </div>
            
            <!-- MAD Threshold -->
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-[10px] text-gray-500">MAD Threshold</label>
                <span class="text-[10px] font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">{{ priceAnalysis.params.madThreshold }}</span>
              </div>
              <input 
                type="range" 
                v-model.number="priceAnalysis.params.madThreshold" 
                min="1" max="4" step="0.5"
                class="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 accent-primary-500"
              />
            </div>
            
            <!-- Run Button -->
            <UButton 
              block 
              color="primary" 
              @click="runPriceAnalysis" 
              :loading="priceAnalysis.isLoading.value"
              icon="i-heroicons-play"
            >
              Esegui Analisi
            </UButton>
          </div>
          
          <!-- Results Summary -->
          <div v-if="priceAnalysis.analysisResult.value" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
            <h4 class="font-bold text-[10px] uppercase text-gray-400">Risultati</h4>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div><span class="text-gray-500">Analizzati:</span> <span class="font-bold">{{ priceAnalysis.analysisResult.value.total_items }}</span></div>
              <div><span class="text-gray-500">Categorie:</span> <span class="font-bold">{{ priceAnalysis.analysisResult.value.categories_analyzed }}</span></div>
              <div class="col-span-2">
                <span class="text-gray-500">Outliers:</span> 
                <span class="font-bold text-red-500">{{ priceAnalysis.analysisResult.value.outliers_found }}</span>
                <span class="text-gray-400">({{ priceAnalysis.outlierPercent.value }}%)</span>
              </div>
            </div>
          </div>
          
          <!-- Outlier List -->
          <div v-if="priceAnalysis.outlierItems.value.length > 0" class="space-y-1">
            <h4 class="font-bold text-[10px] uppercase text-gray-400 mb-2">Outliers</h4>
            <button 
              v-for="item in priceAnalysis.outlierItems.value.slice(0, 10)" 
              :key="item.item_id"
              @click="navigateToOutlier(item.item_id)"
              class="w-full text-left p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800"
            >
              <div class="flex justify-between items-center">
                <span class="font-mono font-medium">{{ item.code }}</span>
                <span :class="(item.delta || 0) > 0 ? 'text-red-600' : 'text-green-600'" class="font-semibold">
                  {{ (item.delta || 0) > 0 ? '+' : '' }}{{ ((item.delta || 0) * 100).toFixed(0) }}%
                </span>
              </div>
              <div class="text-gray-500 truncate mt-0.5">{{ item.description }}</div>
            </button>
            <div v-if="priceAnalysis.outlierItems.value.length > 10" class="text-center text-[10px] text-gray-400 pt-1">
              +{{ priceAnalysis.outlierItems.value.length - 10 }} altri
            </div>
          </div>
          
          <!-- Empty State -->
          <div v-else-if="priceAnalysis.analysisResult.value && priceAnalysis.outlierItems.value.length === 0" class="text-center py-6">
            <UIcon name="i-heroicons-check-circle" class="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p class="text-xs text-gray-500">Nessun outlier trovato!</p>
          </div>
          
          <!-- Error -->
          <div v-if="priceAnalysis.error.value" class="bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg p-3 text-xs">
            {{ priceAnalysis.error.value }}
          </div>
        </div>
      </template>
    </div>

    <!-- Main Chart Area -->
    <div class="flex-1 relative flex flex-col h-full bg-slate-50 dark:bg-slate-950/50">
      
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
              <div class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: getClusterColor(hoveredPoint.cluster) }"></div>
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
        <div v-if="analytics.selectionStats.value && analytics.selectedPointIds.value.size > 0" 
             class="absolute bottom-4 left-4 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-lg rounded-xl p-4 border border-gray-200 dark:border-gray-700 max-w-xs">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold text-sm text-gray-900 dark:text-white">Selezione</h3>
            <button @click="analytics.clearSelection()" class="text-gray-400 hover:text-gray-600">
              <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
            </button>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div><span class="text-gray-500">Punti:</span> <span class="font-bold">{{ analytics.selectionStats.value.count }}</span></div>
            <div v-if="analytics.selectionStats.value.sumAmount !== null"><span class="text-gray-500">Totale:</span> <span class="font-bold text-green-600">{{ formatCurrency(analytics.selectionStats.value.sumAmount) }}</span></div>
            <div v-if="analytics.selectionStats.value.mean !== null"><span class="text-gray-500">Media:</span> <span class="font-bold">{{ formatCurrency(analytics.selectionStats.value.mean) }}</span></div>
            <div v-if="analytics.selectionStats.value.median !== null"><span class="text-gray-500">Mediana:</span> <span class="font-bold">{{ formatCurrency(analytics.selectionStats.value.median) }}</span></div>
          </div>
          <div v-if="analytics.selectionStats.value.topCategories.length > 0" class="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div class="flex flex-wrap gap-1">
              <span v-for="cat in analytics.selectionStats.value.topCategories.slice(0, 3)" :key="cat.name" 
                    class="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                {{ cat.name }}
              </span>
            </div>
          </div>
        </div>
      </transition>

      <!-- Lasso Hint (Bottom Right) -->
      <div v-if="mode === '2d' && !analytics.selectedPointIds.value.size" class="absolute bottom-4 right-4 z-10">
        <div class="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[10px] text-gray-500 border border-gray-200 dark:border-gray-700">
          <UIcon name="i-heroicons-cursor-arrow-rays" class="inline mr-1" />
          Usa <kbd class="bg-gray-200 dark:bg-gray-700 px-1 rounded">lasso</kbd> dalla toolbar
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
            @selected="onPointSelected"
            @deselect="onPointDeselect"
            class="w-full h-full"
        />
      </ClientOnly>
    </div>

    <!-- Right Detail Panel -->
    <transition 
        enter-active-class="transform transition ease-out duration-300" 
        enter-from-class="translate-x-full" 
        enter-to-class="translate-x-0"
        leave-active-class="transform transition ease-in duration-200" 
        leave-from-class="translate-x-0" 
        leave-to-class="translate-x-full"
    >
      <div v-if="isDetailOpen && selectedPointDetails" class="absolute top-0 right-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 z-50 flex flex-col">
        
        <!-- Header -->
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/80 dark:bg-gray-800/50">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-3 h-3 rounded-full flex-shrink-0" :style="{ backgroundColor: getClusterColor(selectedPointDetails.cluster) }"></span>
            <span class="font-bold text-sm truncate">Cluster {{ selectedPointDetails.cluster }}</span>
          </div>
          <div class="flex items-center gap-1">
            <!-- Copy ID Button -->
            <UTooltip :text="selectedPointDetails.id">
              <UButton 
                icon="i-heroicons-clipboard-document" 
                size="xs" 
                variant="ghost" 
                color="neutral"
                @click="copyToClipboard(selectedPointDetails.id)"
              />
            </UTooltip>
            <UButton 
              icon="i-heroicons-x-mark" 
              size="xs" 
              variant="ghost" 
              color="neutral"
              @click="isDetailOpen = false"
            />
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          
          <!-- Description -->
          <div>
            <p class="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
              {{ selectedPointDetails.label }}
            </p>
          </div>

          <!-- Key Info Cards -->
          <div class="grid grid-cols-2 gap-2">
            <div v-if="selectedPointDetails.price" class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
              <span class="text-[10px] text-green-600 dark:text-green-400 uppercase font-bold block mb-1">Prezzo</span>
              <span class="text-lg font-bold text-green-700 dark:text-green-300">{{ formatCurrency(selectedPointDetails.price) }}</span>
            </div>
            <div v-if="selectedPointDetails.unit" class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <span class="text-[10px] text-gray-500 uppercase font-bold block mb-1">Unità</span>
              <span class="text-lg font-bold text-gray-700 dark:text-gray-300">{{ selectedPointDetails.unit }}</span>
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
                @click="navigateToNeighbor(neighbor.id)"
                class="w-full text-left p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors group"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: getClusterColor(neighbor.clusterId) }"></span>
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
              <div>ID: {{ selectedPointDetails.id }}</div>
              <div>Coord: [{{ selectedPointDetails.x?.toFixed(4) }}, {{ selectedPointDetails.y?.toFixed(4) }}{{ mode === '3d' ? `, ${selectedPointDetails.z?.toFixed(4)}` : '' }}]</div>
            </div>
          </details>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup lang="ts">
import { useSemanticMap } from '~/composables/useSemanticMap';
import { 
  useSemanticMapAnalytics, 
  buildMarkerConfig, 
  buildNeighborLinesTrace, 
  exportToCsv,
  type Point 
} from '~/composables/useSemanticMapAnalytics';
import { usePriceAnalysis } from '~/composables/usePriceAnalysis';

const route = useRoute();
const projectId = route.params.id as string;
const toast = useToast();

// UI State
const activeTab = ref<'explore' | 'analysis'>('explore');
const pointSize = ref(6);
const showGrid = ref(false);
const isDetailOpen = ref(false);
const selectedPointDetails = ref<any>(null);
const hoveredPoint = ref<any>(null);
const zoomRange = ref<{ x: number[] | null, y: number[] | null }>({ x: null, y: null });
const showAllClusters = ref(false);

const { 
    mode, 
    points, 
    status, 
    clusters, 
    selectedCluster, 
    searchQuery, 
    searchResults,
    performSearch, 
    triggerCompute,
    isLoading
} = useSemanticMap(projectId);

const analytics = useSemanticMapAnalytics();
const colorBy = analytics.colorBy;

// Price Analysis
const priceAnalysis = usePriceAnalysis(projectId);

const colorByOptions = [
  { label: 'Cluster', value: 'cluster' },
  { label: 'Prezzo/Importo', value: 'amount' },
  { label: 'Categoria', value: 'category' },
  { label: 'Score', value: 'score' },
  { label: 'Outlier', value: 'outlier' },
];

// --- Computed ---

const hasActiveFilters = computed(() => selectedCluster.value !== null || searchResults.value.length > 0);
const hasZoomed = computed(() => zoomRange.value.x !== null);

const visibleClusters = computed(() => {
  if (showAllClusters.value) return clusters.value;
  return clusters.value.slice(0, 5);
});

const filteredPoints = computed(() => {
    if (!points.value) return [];
    let subset = (points.value as any[]);
    if (selectedCluster.value !== null) {
        subset = subset.filter(p => p.cluster === selectedCluster.value);
    }
    return subset;
});

const currentNeighbors = computed(() => {
  if (!analytics.clickedPointId.value || !points.value) return [];
  return analytics.getClickedPointNeighbors(points.value as Point[], mode.value);
});

// --- Poles Integration ---
const poles = ref<any[]>([]);

// Fetch poles when project changes or status changes
// Explicit fetch function
const fetchPoles = async () => {
    if (!projectId) return;
    try {
        console.log('[Visualizer] Fetching poles explicit...');
        const { poles: fetchedPoles } = await $fetch<any>('/api/analytics/global-map', {
            method: 'POST',
            body: { project_ids: [projectId] }
        });
        poles.value = fetchedPoles || [];
        console.log(`[Visualizer] Poles set: ${poles.value.length}`);
        
        // Visual feedback
        const toast = useToast();
        toast.add({
            title: 'Poli Caricati',
            description: `Trovati ${poles.value.length} poli gravitazionali.`,
            color: poles.value.length > 0 ? 'green' : 'orange'
        });
    } catch (e) {
        console.error("Failed to fetch poles", e);
        const toast = useToast();
        toast.add({ title: 'Errore', description: 'Impossibile caricare i poli.', color: 'red' });
    }
};

// Fetch poles when project changes or status changes
watch([() => projectId, status], async ([pid, s]) => {
    if (pid && s === 'success') {
         // Only auto-fetch if showPoles is true
         if (showPoles.value) await fetchPoles();
    }
}, { immediate: true });

watch(showPoles, (val) => {
    if (val && poles.value.length === 0) {
        fetchPoles();
    }
});

onMounted(() => {
    // Retry fetch after a short delay to ensure everything is ready
    setTimeout(() => {
        if (poles.value.length === 0) fetchPoles();
    }, 1000);
});

const showPoles = ref(true); // Default enabled, but toggleable

const plotData = computed(() => {
    const subset = filteredPoints.value;
    const currentPoles = showPoles.value ? poles.value : [];
    
    const traces: any[] = [];
    
    // 1. Points Trace
    if (subset.length > 0) {
        const xs = subset.map(p => p.x);
        const ys = subset.map(p => p.y);
        const zs = subset.map(p => p.z);
        const ids = subset.map(p => p.id);

        const marker = buildMarkerConfig({
          points: subset as Point[],
          colorBy: colorBy.value,
          searchResults: searchResults.value,
          selectedPointIds: analytics.selectedPointIds.value,
          clickedPointId: analytics.clickedPointId.value,
          neighborIds: analytics.neighborIds.value,
          pointSize: pointSize.value,
          clusterPalette: analytics.clusterPalette.value,
          outlierIds: priceAnalysis.outlierIds.value,
        });

        if (mode.value === '3d') {
            traces.push({
                type: 'scatter3d',
                mode: 'markers',
                x: xs, y: ys, z: zs,
                customdata: ids,
                hoverinfo: 'none',
                marker,
                name: 'Items'
            });
        } else {
            traces.push({
                type: 'scattergl',
                mode: 'markers',
                x: xs, y: ys,
                customdata: ids,
                hoverinfo: 'none',
                marker,
                name: 'Items'
            });
        }
    }

    // 2. Poles Trace
    if (currentPoles.length > 0) {
        const px = currentPoles.map(p => p.x);
        const py = currentPoles.map(p => p.y);
        const pz = currentPoles.map(p => p.z);
        const pids = currentPoles.map(p => `POLE_${p.wbs6}`);
        const plabels = currentPoles.map(p => `Polo: ${p.wbs6}`);
        
        const poleMarker = {
            size: pointSize.value * 2, // Bigger
            symbol: mode.value === '3d' ? 'diamond' : 'star',
            color: '#FFD700', // Gold
            line: { color: '#000', width: 1 },
            opacity: 0.9
        };

        if (mode.value === '3d') {
            traces.push({
                type: 'scatter3d',
                mode: 'markers',
                x: px, y: py, z: pz,
                text: plabels,
                hoverinfo: 'text',
                marker: poleMarker,
                name: 'Poles'
            });
        } else {
            traces.push({
                type: 'scattergl',
                mode: 'markers',
                x: px, y: py,
                text: plabels,
                hoverinfo: 'text',
                marker: poleMarker,
                name: 'Poles'
            });
        }
    }

    // 3. Neighbor Lines
    if (analytics.clickedPointId.value && analytics.neighborIds.value.length > 0) {
      const linesTrace = buildNeighborLinesTrace(
        subset as Point[],
        analytics.clickedPointId.value,
        analytics.neighborIds.value,
        mode.value
      );
      if (linesTrace) traces.push(linesTrace);
    }

    return traces;
});

const plotLayout = computed(() => {
    const common = {
        margin: { l: 0, r: 0, b: 0, t: 0 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        showlegend: false,
        dragmode: 'pan' as const,
    };

    if (mode.value === '3d') {
        const axisStyle = { visible: showGrid.value, showgrid: showGrid.value, zeroline: false, showline: false, color: '#64748b', showticklabels: false };
        return { ...common, scene: { xaxis: axisStyle, yaxis: axisStyle, zaxis: axisStyle, camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } } } };
    } else {
        const axisStyle = { visible: showGrid.value, showgrid: showGrid.value, gridcolor: 'rgba(148, 163, 184, 0.15)', zeroline: false, showticklabels: false };
        const layout: any = { ...common, xaxis: { ...axisStyle, fixedrange: false }, yaxis: { ...axisStyle, fixedrange: false }, hovermode: 'closest' };
        if (zoomRange.value.x && zoomRange.value.y) {
            layout.xaxis.range = zoomRange.value.x;
            layout.yaxis.range = zoomRange.value.y;
        }
        return layout;
    }
});

const plotConfig = computed(() => ({
  responsive: true,
  displayModeBar: 'hover',
  displaylogo: false,
  modeBarButtonsToRemove: mode.value === '2d' 
    ? ['toImage', 'sendDataToCloud', 'toggleHover', 'toggleSpikelines', 'hoverCompareCartesian', 'hoverClosestCartesian']
    : ['toImage', 'sendDataToCloud', 'lasso2d', 'select2d'],
}));

// --- Helpers ---

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value);
}

function getClusterColor(clusterId: number): string {
  const palette = analytics.clusterPalette.value;
  return palette[Math.abs(clusterId) % palette.length];
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
  toast.add({ title: 'Copiato!', description: 'ID copiato negli appunti', color: 'success', icon: 'i-heroicons-clipboard-document-check' });
}

async function copySelectedIds() {
  const ids = Array.from(analytics.selectedPointIds.value).join('\n');
  await navigator.clipboard.writeText(ids);
  toast.add({ title: 'Copiato!', description: `${analytics.selectedPointIds.value.size} ID copiati`, color: 'success' });
}

// --- Actions ---

function setMode(m: '2d' | '3d') {
    mode.value = m;
    zoomRange.value = { x: null, y: null };
    analytics.clearClickedPoint();
}

function resetView() {
    selectedCluster.value = null;
    searchQuery.value = '';
    searchResults.value = [];
    zoomRange.value = { x: null, y: null };
    analytics.clearSelection();
    analytics.clearClickedPoint();
    isDetailOpen.value = false;
}

function onPointClick(data: any) {
    if(!data?.points?.[0]) return;
    const id = data.points[0].customdata;
    const fullPoint = (points.value as any[])?.find(p => p.id === id);
    if (fullPoint) {
        selectedPointDetails.value = fullPoint;
        isDetailOpen.value = true;
        analytics.setClickedPoint(id, points.value as Point[], mode.value);
    }
}

function onPointHover(data: any) {
    if(!data?.points?.[0]) return;
    const id = data.points[0].customdata;
    hoveredPoint.value = (points.value as any[])?.find(p => p.id === id);
}

function onPointUnhover() {
    hoveredPoint.value = null;
}

function onPointSelected(data: any) {
  if (!data?.points?.length) { analytics.clearSelection(); return; }
  const ids = data.points.map((p: any) => p.customdata).filter(Boolean);
  if (ids.length && points.value) analytics.setSelection(ids, points.value as Point[]);
}

function onPointDeselect() {
  analytics.clearSelection();
}

function toggleCluster(id: number) {
    if (selectedCluster.value === id) {
        selectedCluster.value = null;
        zoomRange.value = { x: null, y: null };
    } else {
        selectedCluster.value = id;
        const clusterPoints = (points.value as any[]).filter(p => p.cluster === id);
        updateZoomToPoints(clusterPoints);
    }
}

async function handleSearch() {
    await performSearch(searchQuery.value);
    if (searchResults.value.length > 0) {
        const matching = (points.value as any[]).filter(p => searchResults.value.includes(p.id));
        if (matching.length) updateZoomToPoints(matching);
    } else if (!searchQuery.value) {
        zoomRange.value = { x: null, y: null };
    }
}

function updateZoomToPoints(targetPoints: any[]) {
    if (mode.value === '3d' || !targetPoints.length) return;
    const xs = targetPoints.map(p => p.x);
    const ys = targetPoints.map(p => p.y);
    const padX = (Math.max(...xs) - Math.min(...xs)) * 0.1 || 1;
    const padY = (Math.max(...ys) - Math.min(...ys)) * 0.1 || 1;
    zoomRange.value = { x: [Math.min(...xs) - padX, Math.max(...xs) + padX], y: [Math.min(...ys) - padY, Math.max(...ys) + padY] };
}

function handleExportCsv() {
  const pts = analytics.selectedPointIds.value.size > 0
    ? filteredPoints.value.filter(p => analytics.selectedPointIds.value.has(p.id))
    : filteredPoints.value;
  exportToCsv(pts as Point[], `semantic-map-${projectId}-${new Date().toISOString().slice(0,10)}.csv`);
  toast.add({ title: 'Export completato', description: `${pts.length} elementi esportati`, color: 'success' });
}

function navigateToNeighbor(id: string) {
  const point = (points.value as any[])?.find(p => p.id === id);
  if (point) {
    selectedPointDetails.value = point;
    analytics.setClickedPoint(id, points.value as Point[], mode.value);
  }
}

// --- Price Analysis Functions ---

async function runPriceAnalysis() {
  await priceAnalysis.runAnalysis();
  
  if (priceAnalysis.analysisResult.value) {
    toast.add({
      title: 'Analisi completata',
      description: `${priceAnalysis.analysisResult.value.outliers_found} outlier trovati`,
      color: priceAnalysis.analysisResult.value.outliers_found > 0 ? 'warning' : 'success'
    });
    
    // Auto-switch to outlier coloring if outliers found
    if (priceAnalysis.analysisResult.value.outliers_found > 0) {
      colorBy.value = 'outlier';
    }
  }
}

function navigateToOutlier(itemId: string) {
  const point = (points.value as any[])?.find(p => p.id === itemId);
  if (point) {
    selectedPointDetails.value = point;
    isDetailOpen.value = true;
    analytics.setClickedPoint(itemId, points.value as Point[], mode.value);
    
    // Zoom to the point
    if (mode.value === '2d') {
      const pad = 5;
      zoomRange.value = {
        x: [point.x - pad, point.x + pad],
        y: [point.y - pad, point.y + pad]
      };
    }
  }
}
</script>
