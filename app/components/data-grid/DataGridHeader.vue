<template>
  <div class="flex flex-col gap-1 relative">
    <div class="flex items-center gap-1 text-[11px] font-semibold text-slate-800 whitespace-nowrap">
      <span>{{ params.displayName }}</span>
      <button
        class="text-[11px] px-1 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 transition leading-none"
        type="button"
        title="Ordina"
        @click="cycleSort"
      >
        {{ sortIcon }}
      </button>
      <button
        :class="[
          'text-[11px] px-1 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 transition leading-none',
          filterActive ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : '',
        ]"
        type="button"
        title="Filtro"
        @click="openFilter"
      >
        ⏷
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  params: any;
}>();

const sortState = ref<'asc' | 'desc' | null>((props.params.column?.getSort() as any) || null);

const cycleSort = () => {
  const next = sortState.value === 'asc' ? 'desc' : sortState.value === 'desc' ? null : 'asc';
  sortState.value = next;
  props.params.api.applyColumnState({
    state: [{ colId: props.params.column?.getColId(), sort: next || undefined }],
    defaultState: { sort: null },
  });
  props.params.api.onSortChanged();
  props.params.api.refreshHeader();
};

const sortIcon = computed(() => {
  if (sortState.value === 'asc') return '▲';
  if (sortState.value === 'desc') return '▼';
  return '⇅';
});

const filterActive = computed(() => props.params.column?.isFilterActive?.());

const openFilter = (event: MouseEvent) => {
  const options = props.params?.valuesGetter?.() ?? [];
  props.params.context?.openFilterPanel?.({
    field: props.params.column?.getColId?.(),
    label: props.params.displayName,
    options,
    rect: (event.currentTarget as HTMLElement).getBoundingClientRect(),
  });
};
</script>
