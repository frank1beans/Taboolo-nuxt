<template>
  <div class="flex flex-col gap-1 relative">
    <div class="flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap">
      <span class="text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
        {{ params.displayName }}
      </span>
      
      <!-- Sort Button -->
      <button
        v-if="isSortable"
        :class="[
          'inline-flex items-center justify-center w-6 h-6 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.6)] border',
          sortState
            ? 'bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.4)]'
            : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.6)] hover:text-[hsl(var(--foreground))]'
        ]"
        type="button"
        :aria-label="`Ordina per ${params.displayName}`"
        :title="`Ordina per ${params.displayName}`"
        @click="cycleSort"
      >
        <Icon 
          :name="sortIconName" 
          :class="iconSize"
        />
      </button>
      
      <!-- Filter Button -->
      <button
        v-if="isFilterable"
        :class="[
          'relative inline-flex items-center justify-center w-6 h-6 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.6)] border',
          isFilterActive
            ? 'bg-[hsl(var(--success)/0.14)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.4)]'
            : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.6)] hover:text-[hsl(var(--foreground))]'
        ]"
        type="button"
        :aria-label="filterTooltip"
        :title="filterTooltip"
        @click="openFilter"
      >
        <Icon 
          :name="isFilterActive ? 'heroicons:funnel-solid' : 'heroicons:funnel'" 
          :class="iconSize"
        />
        <span
          v-if="isFilterActive"
          class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[hsl(var(--success))] ring-2 ring-[hsl(var(--card))]"
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

const iconSize = 'w-4 h-4';

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
  if (sortState.value === 'asc') return 'heroicons:bars-arrow-up';
  if (sortState.value === 'desc') return 'heroicons:bars-arrow-down';
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
  };
  const suffix = operator === 'is_empty' || operator === 'is_not_empty' ? '' : `${value ? `: ${value}` : ''}`;
  return `Filtro attivo: ${labels[operator] || 'Filtro'}${suffix}`;
});

const openFilter = (event: MouseEvent) => {
  const options = props.params?.valuesGetter?.() ?? [];
  const target = (event.currentTarget as HTMLElement) || null;
  const colDef = props.params.column?.getColDef?.();
  const filterType = colDef?.filter === 'agNumberColumnFilter' ? 'number' : 'text';

  props.params.context?.openFilterPanel?.({
    field: props.params.column?.getColId?.(),
    label: props.params.displayName,
    options,
    triggerEl: target,
    filterType,
  });
};
</script>
