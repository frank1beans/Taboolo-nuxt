<template>
  <!-- Root container with group class for hover detection -->
  <div class="flex items-center gap-1.5 h-full w-full min-w-0 group/header">
    <!-- Column Label - flexible to allow truncation -->
    <span class="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] truncate flex-1 min-w-0">
      {{ params.displayName }}
    </span>
    
    <!-- Controls container - always visible -->
    <div class="flex items-center gap-0.5 flex-shrink-0">
      <!-- Sort Button - Always visible, low opacity when inactive -->
      <button
        v-if="isSortable"
        :class="[
          'inline-flex items-center justify-center w-5 h-5 rounded transition-all duration-100 focus:outline-none',
          sortState
            ? 'opacity-100 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]'
            : 'opacity-35 hover:opacity-100 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]'
        ]"
        type="button"
        :aria-label="`Ordina per ${params.displayName}`"
        :title="`Ordina per ${params.displayName}`"
        @click="cycleSort"
      >
        <Icon 
          :name="sortIconName" 
          class="w-3.5 h-3.5"
        />
      </button>
      
      <!-- Filter Button - Always visible, low opacity when inactive -->
      <button
        v-if="isFilterable"
        :class="[
          'inline-flex items-center justify-center w-5 h-5 rounded transition-all duration-100 focus:outline-none',
          isFilterActive
            ? 'opacity-100 text-[hsl(var(--acc-primary,152_60%_45%))] hover:bg-[hsl(var(--acc-primary,152_60%_45%)/0.1)]'
            : 'opacity-35 hover:opacity-100 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]'
        ]"
        type="button"
        :aria-label="filterTooltip"
        :title="filterTooltip"
        @click="openFilter"
      >
        <Icon 
          :name="isFilterActive ? 'heroicons:funnel-solid' : 'heroicons:funnel'" 
          class="w-3.5 h-3.5"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import type { IHeaderParams } from 'ag-grid-community';
import type { ColumnFilter, FilterPanelConfig } from '~/types/data-grid';

type HeaderParams = IHeaderParams & {
  context?: {
    getCurrentFilter?: (field: string) => ColumnFilter | null;
    openFilterPanel?: (config: FilterPanelConfig) => void;
  };
  valuesGetter?: () => string[];
};

const props = defineProps<{
  params: HeaderParams;
}>();

const sortState = ref<'asc' | 'desc' | null>((props.params.column?.getSort() as 'asc' | 'desc' | null) || null);
const isSortable = computed(() => props.params.column?.getColDef?.()?.sortable !== false);
const isFilterable = computed(() => props.params.column?.getColDef?.()?.filter !== false);

const isFilterActive = ref(false);

const updateFilterState = () => {
  isFilterActive.value = props.params.column?.isFilterActive?.() ?? false;
};

// Also listen to sort changes to update sort state
const onSortChanged = () => {
  sortState.value = (props.params.column?.getSort() as 'asc' | 'desc' | null) || null;
};

onMounted(() => {
  updateFilterState();
  props.params.api.addEventListener('filterChanged', updateFilterState);
  props.params.api.addEventListener('sortChanged', onSortChanged);
});

onBeforeUnmount(() => {
  props.params.api.removeEventListener('filterChanged', updateFilterState);
  props.params.api.removeEventListener('sortChanged', onSortChanged);
});

const cycleSort = () => {
  const next = sortState.value === 'asc' ? 'desc' : sortState.value === 'desc' ? null : 'asc';
  sortState.value = next;
  props.params.api.applyColumnState({
    state: [{ colId: props.params.column?.getColId(), sort: next || undefined }],
    defaultState: { sort: null },
  });
  // No need to manually call onSortChanged or refreshHeader, the event listener will handle it
};

const sortIconName = computed(() => {
  if (sortState.value === 'asc') return 'heroicons:bars-arrow-down';
  if (sortState.value === 'desc') return 'heroicons:bars-arrow-up';
  return 'heroicons:arrows-up-down';
});

const activeFilter = computed(() => {
  const colId = props.params.column?.getColId?.();
  return colId ? props.params.context?.getCurrentFilter?.(colId) ?? null : null;
});

const filterTooltip = computed(() => {
  if (!isFilterActive.value || !activeFilter.value) return 'Filtro';
  const { operator, value } = activeFilter.value;
  const labels: Record<string, string> = {
    contains: 'Contiene',
    starts_with: 'Inizia con',
    equals: 'Uguale a',
    not_contains: 'Non contiene',
    is_empty: 'Vuoto',
    is_not_empty: 'Non vuoto',
    in: 'Selezionati',
  };
  const valueLabel = Array.isArray(value)
    ? (value.length <= 2 ? value.join(', ') : `${value.length}`)
    : value;
  const suffix = operator === 'is_empty' || operator === 'is_not_empty'
    ? ''
    : `${valueLabel ? `: ${valueLabel}` : ''}`;
  return `Filtro attivo: ${labels[operator] || 'Filtro'}${suffix}`;
});

const openFilter = (event: MouseEvent) => {
  const options = props.params?.valuesGetter?.() ?? [];
  const target = (event.currentTarget as HTMLElement) || null;
  const colDef = props.params.column?.getColDef?.();
  const filterMode = (colDef?.context as { filterMode?: string } | undefined)?.filterMode;
  const isMulti = filterMode === 'multi' || colDef?.filter === 'agSetColumnFilter';
  const filterType = isMulti ? 'set' : (colDef?.filter === 'agNumberColumnFilter' ? 'number' : 'text');

  props.params.context?.openFilterPanel?.({
    field: props.params.column?.getColId?.(),
    label: props.params.displayName,
    options,
    triggerEl: target,
    filterType,
    multiSelect: isMulti,
  });
};
</script>
