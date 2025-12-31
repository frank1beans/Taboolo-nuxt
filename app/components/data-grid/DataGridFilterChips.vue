<template>
  <!-- ACC-style unified filter bar - positioned above grid -->
  <div 
    v-if="allFilters.length > 0"
    class="flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--card))] border-b border-[hsl(var(--border)/0.5)]"
  >
    <!-- Filter icon and label -->
    <div class="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-medium text-[hsl(var(--muted-foreground))] flex-shrink-0">
      <Icon name="heroicons:funnel" class="w-3.5 h-3.5" />
      <span>Filtri</span>
    </div>

    <!-- Filter chips -->
    <div class="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
      <!-- WBS Filters (Green) -->
      <button
        v-for="f in wbsFilters"
        :key="`wbs-${f.field}`"
        type="button"
        class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all duration-150 cursor-pointer hover:shadow-sm active:scale-[0.98] bg-[hsl(var(--acc-filter-wbs-bg,152_45%_92%))] text-[hsl(var(--acc-filter-wbs-text,152_65%_28%))] border border-[hsl(var(--acc-filter-wbs-border,152_45%_75%))] hover:bg-[hsl(var(--acc-filter-wbs-bg,152_45%_92%)/0.7)] group"
        :title="`Rimuovi filtro: ${f.label}`"
        @click="$emit('remove', f.field)"
      >
        <Icon name="heroicons:squares-2x2" class="w-3 h-3 opacity-70" />
        <span class="truncate max-w-48">{{ f.label }}</span>
        <span v-if="f.value && f.value !== f.label" class="opacity-70 truncate max-w-32">{{ formatValue(f) }}</span>
        <Icon name="heroicons:x-mark" class="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
      </button>

      <!-- Column Filters (Blue) -->
      <button
        v-for="f in columnFilters"
        :key="`col-${f.field}`"
        type="button"
        class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all duration-150 cursor-pointer hover:shadow-sm active:scale-[0.98] bg-[hsl(var(--acc-filter-column-bg,210_50%_93%))] text-[hsl(var(--acc-filter-column-text,210_65%_35%))] border border-[hsl(var(--acc-filter-column-border,210_45%_78%))] hover:bg-[hsl(var(--acc-filter-column-bg,210_50%_93%)/0.7)] group"
        :title="`Rimuovi filtro: ${f.label}`"
        @click="$emit('remove', f.field)"
      >
        <Icon name="heroicons:table-cells" class="w-3 h-3 opacity-70" />
        <span class="font-medium">{{ f.label }}:</span>
        <span class="truncate max-w-32 opacity-80">{{ formatValue(f) }}</span>
        <Icon name="heroicons:x-mark" class="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
      </button>
    </div>

    <!-- Clear all button -->
    <button
      type="button"
      class="flex-shrink-0 text-[11px] font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] underline underline-offset-2 transition-colors"
      @click="$emit('clear-all')"
    >
      Pulisci tutti
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ActiveFilter, ColumnFilterOperator } from '~/types/data-grid';

const props = defineProps<{
  filters: ActiveFilter[];
}>();

defineEmits<{
  remove: [field: string];
  'clear-all': [];
}>();

// Separate WBS and column filters
const wbsFilters = computed(() => 
  props.filters.filter(f => f.filterType === 'wbs')
);

const columnFilters = computed(() => 
  props.filters.filter(f => f.filterType !== 'wbs')
);

const allFilters = computed(() => props.filters);

const operatorLabel: Record<ColumnFilterOperator, string> = {
  contains: 'Contiene',
  starts_with: 'Inizia con',
  equals: 'Uguale a',
  not_contains: 'Non contiene',
  not_equals: 'Diverso da',
  is_empty: 'Vuoti',
  is_not_empty: 'Non vuoti',
  greater_than: '>',
  less_than: '<',
  greater_than_or_equal: '≥',
  less_than_or_equal: '≤',
  in_range: 'Intervallo',
  in: 'Selezionati',
};

const formatValue = (filter: ActiveFilter) => {
  if (filter.operator === 'is_empty' || filter.operator === 'is_not_empty') {
    return operatorLabel[filter.operator];
  }
  
  // For WBS filters, just show the value
  if (filter.filterType === 'wbs') {
    return filter.value || '';
  }
  
  // For column filters, show operator + value
  const label = operatorLabel[filter.operator] ?? '';
  if (filter.operator === 'in' && filter.value) {
    const count = filter.value.split(',').length;
    return count > 2 ? `${count} selezionati` : filter.value;
  }
  return filter.value || label;
};
</script>

