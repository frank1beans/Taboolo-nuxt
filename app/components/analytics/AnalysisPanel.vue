<template>
  <div class="p-3 space-y-4">
    <!-- Parameters -->
    <div class="space-y-3">
      <h3 class="font-bold text-[10px] uppercase tracking-wider text-gray-400">Parametri</h3>
      
      <!-- Top K -->
      <div>
        <div class="flex justify-between items-center mb-1">
          <label class="text-[10px] text-gray-500">Top K Neighbors</label>
          <span class="text-[10px] font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">{{ params.topK }}</span>
        </div>
        <input 
          type="range" 
          :value="params.topK"
          @input="updateParam('topK', Number(($event.target as HTMLInputElement).value))"
          min="10" max="50" step="5"
          class="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 accent-primary-500"
        />
      </div>
      
      <!-- Min Similarity -->
      <div>
        <div class="flex justify-between items-center mb-1">
          <label class="text-[10px] text-gray-500">Min Similarity</label>
          <span class="text-[10px] font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">{{ params.minSimilarity.toFixed(2) }}</span>
        </div>
        <input 
          type="range" 
          :value="params.minSimilarity"
          @input="updateParam('minSimilarity', Number(($event.target as HTMLInputElement).value))"
          min="0.3" max="0.9" step="0.05"
          class="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 accent-primary-500"
        />
      </div>
      
      <!-- MAD Threshold -->
      <div>
        <div class="flex justify-between items-center mb-1">
          <label class="text-[10px] text-gray-500">MAD Threshold</label>
          <span class="text-[10px] font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">{{ params.madThreshold }}</span>
        </div>
        <input 
          type="range" 
          :value="params.madThreshold"
          @input="updateParam('madThreshold', Number(($event.target as HTMLInputElement).value))"
          min="1" max="4" step="0.5"
          class="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 accent-primary-500"
        />
      </div>
      
      <!-- Run Button -->
      <UButton 
        block 
        color="primary" 
        @click="$emit('runAnalysis')" 
        :loading="isLoading"
        icon="i-heroicons-play"
      >
        Esegui Analisi
      </UButton>
    </div>
    
    <!-- Results Summary -->
    <div v-if="result" class="bg-[hsl(var(--accent))] rounded-lg p-3 space-y-2">
      <h4 class="font-bold text-[10px] uppercase text-[hsl(var(--muted-foreground))]">Riepilogo</h4>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div><span class="text-[hsl(var(--muted-foreground))]">Voci:</span> <span class="font-bold">{{ result.total_items }}</span></div>
        <div><span class="text-[hsl(var(--muted-foreground))]">Categorie WBS6:</span> <span class="font-bold">{{ result.categories_analyzed }}</span></div>
        <div class="col-span-2 flex items-center gap-2">
          <span class="text-[hsl(var(--muted-foreground))]">Outliers:</span> 
          <span class="font-bold text-red-500">{{ result.outliers_found }}</span>
          <span class="text-[hsl(var(--muted-foreground))]">({{ outlierPercent }}%)</span>
        </div>
      </div>
    </div>
    
    <!-- Category Analysis -->
    <div v-if="result?.categories?.length" class="space-y-2">
      <div class="flex justify-between items-center">
        <h4 class="font-bold text-[10px] uppercase text-[hsl(var(--muted-foreground))]">Categorie WBS6</h4>
        <button 
          @click="$emit('toggleShowAll')"
          class="text-[10px] text-[hsl(var(--primary))] hover:underline"
        >
          {{ showAllCategories ? 'Mostra meno' : `Mostra tutte (${result.categories.length})` }}
        </button>
      </div>
      
      <div class="space-y-1.5 max-h-48 overflow-y-auto">
        <div 
          v-for="cat in displayedCategories" 
          :key="cat.wbs6_code"
          class="p-2 rounded-lg bg-[hsl(var(--secondary))] text-xs cursor-pointer hover:bg-[hsl(var(--accent))] transition-colors"
          @click="$emit('selectCategory', selectedCategory === cat.wbs6_code ? null : cat.wbs6_code)"
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
    
    <!-- Error -->
    <div v-if="error" class="bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg p-3 text-xs">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface AnalysisParams {
  topK: number;
  minSimilarity: number;
  madThreshold: number;
}

interface CategoryStats {
  mean: number;
  median: number;
  mad: number;
  min: number;
  max: number;
  std: number;
}

interface Category {
  wbs6_code: string;
  wbs6_description: string;
  item_count: number;
  outlier_count: number;
  stats?: CategoryStats;
}

interface AnalysisResult {
  total_items: number;
  categories_analyzed: number;
  outliers_found: number;
  categories: Category[];
}

const props = defineProps<{
  params: AnalysisParams;
  result: AnalysisResult | null;
  outlierPercent: string;
  isLoading: boolean;
  error: string | null;
  showAllCategories: boolean;
  selectedCategory: string | null;
}>();

const emit = defineEmits<{
  'updateParam': [key: keyof AnalysisParams, value: number];
  'runAnalysis': [];
  'toggleShowAll': [];
  'selectCategory': [code: string | null];
}>();

function updateParam(key: keyof AnalysisParams, value: number) {
  emit('updateParam', key, value);
}

const displayedCategories = computed(() => {
  const cats = props.result?.categories ?? [];
  return props.showAllCategories ? cats : cats.slice(0, 5);
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value);
}
</script>
