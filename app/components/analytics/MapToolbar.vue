<script setup lang="ts">
/**
 * MapToolbar.vue
 * 
 * Floating toolbar for semantic map visualization controls.
 * Uses native dropdowns for better compatibility with Plotly maps.
 */

interface ProjectOption {
  label: string
  value: string
}

interface YearOption {
  label: string
  value: number | null
}

interface BUOption {
  label: string
  value: string | null
}

interface ColorOption {
  label: string
  value: string
}

interface Props {
  // Filter options
  projectOptions?: ProjectOption[]
  yearOptions?: YearOption[]
  buOptions?: BUOption[]
  colorOptions?: ColorOption[]
  
  // Current values (v-model)
  selectedProjects?: ProjectOption[]
  selectedYear?: YearOption | null
  selectedBU?: BUOption | null
  colorBy?: string
  
  // Visualization controls
  pointSize?: number
  is3D?: boolean
  showAxes?: boolean
  showPoles?: boolean
  
  // State
  loading?: boolean
  
  // Mode-specific
  mode?: 'global' | 'properties'
  showAnalysisButton?: boolean
  analysisLoading?: boolean
  showFilters?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  projectOptions: () => [],
  yearOptions: () => [],
  buOptions: () => [],
  colorOptions: () => [
    { label: 'Progetto', value: 'project' },
    { label: 'Cluster', value: 'cluster' },
    { label: 'Prezzo', value: 'amount' },
    { label: 'WBS06', value: 'wbs06' },
  ],
  selectedProjects: () => [],
  selectedYear: null,
  selectedBU: null,
  colorBy: 'project',
  pointSize: 60,
  is3D: false,
  showAxes: false,
  showPoles: true,
  loading: false,
  mode: 'global',
  showAnalysisButton: false,
  analysisLoading: false,
  showFilters: true
})

const emit = defineEmits<{
  'update:selectedProjects': [ProjectOption[]]
  'update:selectedYear': [YearOption | null]
  'update:selectedBU': [BUOption | null]
  'update:colorBy': [string]
  'update:pointSize': [number]
  'update:is3D': [boolean]
  'update:showAxes': [boolean]
  'update:showPoles': [boolean]
  'refresh': []
  'reset': []
  'runAnalysis': []
}>()

// Local state for panel visibility
const showFiltersPanel = ref(false)
const showColorPanel = ref(false)
const showSizePanel = ref(false)

// Computed for active filter count
const activeFilterCount = computed(() => {
  let count = 0
  if (props.selectedProjects.length) count++
  if (props.selectedYear?.value) count++
  if (props.selectedBU?.value) count++
  return count
})

// Emit handlers
const updateProjects = (val: ProjectOption[]) => emit('update:selectedProjects', val)
const updateYear = (val: YearOption | null) => emit('update:selectedYear', val)
const updateBU = (val: BUOption | null) => emit('update:selectedBU', val)
const updateColor = (val: string) => { emit('update:colorBy', val); showColorPanel.value = false }
const updatePointSize = (val: number) => emit('update:pointSize', val)

const togglePoles = () => emit('update:showPoles', !props.showPoles)

// Close panels when clicking outside
const closeAllPanels = () => {
  showFiltersPanel.value = false
  showColorPanel.value = false
  showSizePanel.value = false
}

const toggleFiltersPanel = () => {
  showColorPanel.value = false
  showSizePanel.value = false
  showFiltersPanel.value = !showFiltersPanel.value
}

const toggleColorPanel = () => {
  showFiltersPanel.value = false
  showSizePanel.value = false
  showColorPanel.value = !showColorPanel.value
}

const toggleSizePanel = () => {
  showFiltersPanel.value = false
  showColorPanel.value = false
  showSizePanel.value = !showSizePanel.value
}
</script>

<template>
  <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-[100]">
    <div class="flex items-center gap-2 px-3 py-2 bg-[hsl(var(--card))] rounded-full shadow-xl border border-[hsl(var(--border))]">
      
      <!-- Filters Button + Panel -->
      <div v-if="showFilters" class="relative">
        <UButton 
          color="neutral" 
          variant="ghost" 
          size="sm"
          class="relative"
          @click="toggleFiltersPanel"
        >
          <UIcon name="i-heroicons-funnel" class="w-4 h-4" />
          <span class="hidden sm:inline ml-1">Filtri</span>
          <span v-if="activeFilterCount" class="absolute -top-1 -right-1 w-4 h-4 bg-[hsl(var(--primary))] text-[9px] text-white rounded-full flex items-center justify-center">
            {{ activeFilterCount }}
          </span>
        </UButton>
        
        <!-- Filters Panel -->
        <Transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div 
            v-if="showFiltersPanel" 
            class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[340px] bg-[hsl(var(--card))] rounded-2xl shadow-2xl border border-[hsl(var(--border))] overflow-hidden z-[110]"
          >
            <!-- Header -->
            <div class="px-5 py-4 bg-gradient-to-r from-[hsl(var(--primary)/0.1)] to-transparent border-b border-[hsl(var(--border))]">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.15)] flex items-center justify-center">
                    <UIcon name="i-heroicons-funnel" class="w-4 h-4 text-[hsl(var(--primary))]" />
                  </div>
                  <div>
                    <h4 class="font-semibold text-sm">Filtri Dati</h4>
                    <p class="text-[10px] text-[hsl(var(--muted-foreground))]">Seleziona i dati da visualizzare</p>
                  </div>
                </div>
                <button 
                  class="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1" 
                  @click="emit('reset')"
                >
                  <UIcon name="i-heroicons-arrow-path" class="w-3 h-3" />
                  Reset
                </button>
              </div>
            </div>

            <!-- Content -->
            <div class="p-5 space-y-4">
              <!-- Projects -->
              <div class="space-y-2">
                <label class="flex items-center gap-2 text-xs font-medium text-[hsl(var(--foreground))]">
                  <UIcon name="i-heroicons-folder" class="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                  Progetti
                </label>
                <USelectMenu
                  :model-value="selectedProjects"
                  :items="projectOptions"
                  value-key="value"
                  multiple
                  placeholder="Tutti i progetti"
                  size="sm"
                  @update:model-value="updateProjects"
                />
              </div>
              
              <!-- Year & BU -->
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-2">
                  <label class="flex items-center gap-2 text-xs font-medium text-[hsl(var(--foreground))]">
                    <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                    Anno
                  </label>
                  <USelectMenu
                    :model-value="selectedYear"
                    :items="yearOptions"
                    placeholder="Tutti"
                    size="sm"
                    @update:model-value="updateYear"
                  />
                </div>
                <div class="space-y-2">
                  <label class="flex items-center gap-2 text-xs font-medium text-[hsl(var(--foreground))]">
                    <UIcon name="i-heroicons-building-office" class="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                    Business Unit
                  </label>
                  <USelectMenu
                    :model-value="selectedBU"
                    :items="buOptions"
                    placeholder="Tutte"
                    size="sm"
                    @update:model-value="updateBU"
                  />
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="px-5 py-4 bg-[hsl(var(--muted)/0.3)] border-t border-[hsl(var(--border))]">
              <UButton 
                block 
                size="sm" 
                color="primary"
                :loading="loading"
                icon="i-heroicons-arrow-path"
                @click="emit('refresh'); showFiltersPanel = false"
              >
                Aggiorna Visualizzazione
              </UButton>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Divider -->
      <div v-if="showFilters" class="w-px h-6 bg-[hsl(var(--border))]"/>

      <!-- Color Button + Panel -->
      <div class="relative">
        <UButton 
          color="neutral" 
          variant="ghost" 
          size="sm"
          @click="toggleColorPanel"
        >
          <UIcon name="i-heroicons-swatch" class="w-4 h-4" />
          <span class="hidden sm:inline ml-1">{{ colorOptions.find(o => o.value === colorBy)?.label || 'Colore' }}</span>
        </UButton>
        
        <!-- Color Panel -->
        <Transition
          enter-active-class="transition ease-out duration-150"
          enter-from-class="opacity-0 translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition ease-in duration-100"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-2"
        >
          <div 
            v-if="showColorPanel" 
            class="absolute bottom-full left-0 mb-2 p-3 w-48 bg-[hsl(var(--card))] rounded-xl shadow-2xl border border-[hsl(var(--border))] z-[110]"
          >
            <h4 class="font-semibold text-sm mb-2">Colorazione</h4>
            <div class="space-y-1">
              <button
                v-for="opt in colorOptions"
                :key="opt.value"
                class="w-full px-3 py-2 text-sm text-left rounded-md transition-colors"
                :class="colorBy === opt.value ? 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]' : 'hover:bg-[hsl(var(--muted))]'"
                @click="updateColor(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Divider -->
      <div class="w-px h-6 bg-[hsl(var(--border))]"/>

      <!-- Toggle Buttons -->
      <div class="flex items-center gap-1">
        <UTooltip text="Mostra Poli">
          <button
            class="p-2 rounded-full transition-colors"
            :class="showPoles ? 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'"
            @click="togglePoles"
          >
            <UIcon name="i-heroicons-map-pin" class="w-4 h-4" />
          </button>
        </UTooltip>
      </div>

      <!-- Divider -->
      <div class="w-px h-6 bg-[hsl(var(--border))]"/>

      <!-- Point Size Button + Panel -->
      <div class="relative">
        <UButton 
          color="neutral" 
          variant="ghost" 
          size="sm"
          @click="toggleSizePanel"
        >
          <span class="text-xs font-mono">{{ pointSize }}px</span>
        </UButton>
        
        <!-- Size Panel -->
        <Transition
          enter-active-class="transition ease-out duration-150"
          enter-from-class="opacity-0 translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition ease-in duration-100"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-2"
        >
          <div 
            v-if="showSizePanel" 
            class="absolute bottom-full right-0 mb-2 p-3 w-48 bg-[hsl(var(--card))] rounded-xl shadow-2xl border border-[hsl(var(--border))] z-[110]"
          >
            <h4 class="font-semibold text-sm mb-2">Dimensione Punti</h4>
            <input 
              type="range" 
              :value="pointSize"
              min="2"
              max="30" 
              class="slider-theme"
              @input="updatePointSize(Number(($event.target as HTMLInputElement).value))"
            >
            <div class="text-center text-sm font-mono mt-1">{{ pointSize }}px</div>
          </div>
        </Transition>
      </div>

      <!-- Analysis Button (visible in analysis mode) -->
      <template v-if="showAnalysisButton">
        <div class="w-px h-6 bg-[hsl(var(--border))]"/>
        <UButton 
          color="primary" 
          size="sm"
          :loading="analysisLoading"
          @click="emit('runAnalysis')"
        >
          <UIcon name="i-heroicons-play" class="w-4 h-4 mr-1" />
          Analisi
        </UButton>
      </template>

    </div>
    
    <!-- Click-away overlay when a panel is open -->
    <div 
      v-if="showFiltersPanel || showColorPanel || showSizePanel"
      class="fixed inset-0 z-[90]"
      @click="closeAllPanels"
    />
  </div>
</template>
