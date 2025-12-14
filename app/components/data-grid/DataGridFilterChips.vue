<template>
  <div class="border-t px-4 py-2.5 border-[hsl(var(--border))] bg-[hsl(var(--card))]">
    <div class="text-[10px] uppercase tracking-wider font-semibold mb-2 flex items-center justify-between text-[hsl(var(--muted-foreground))]">
      <div class="flex items-center gap-1.5">
        <Icon name="heroicons:funnel" class="w-3.5 h-3.5" />
        <span>Filtri attivi</span>
        <span
          v-if="filters.length"
          class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-[hsl(var(--success)/0.18)] text-[hsl(var(--success))]"
        >
          {{ filters.length }}
        </span>
      </div>
      <UButton
        v-if="filters.length"
        color="gray"
        variant="ghost"
        size="xs"
        icon="i-heroicons-x-mark"
        class="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        @click="$emit('clear-all')"
      >
        Pulisci tutti
      </UButton>
    </div>
    
    <div v-if="filters.length" class="flex flex-wrap gap-2">
      <div
        v-for="f in filters"
        :key="f.field"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.4)]"
      >
        <Icon name="heroicons:tag" class="w-3 h-3 opacity-60" />
        <span class="font-semibold">{{ f.label }}:</span>
        <span class="opacity-80">{{ formatValue(f) }}</span>
        <button
          type="button"
          class="ml-1 -mr-1 p-0.5 rounded hover:bg-[hsl(var(--muted)/0.6)] transition-colors"
          @click="$emit('remove', f.field)"
        >
          <Icon name="heroicons:x-mark" class="w-3 h-3" />
        </button>
      </div>
    </div>
    
    <div v-else class="text-xs flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
      <Icon name="heroicons:information-circle" class="w-4 h-4" />
      <span>Nessun filtro applicato</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ActiveFilter, ColumnFilterOperator } from '~/types/data-grid';

defineProps<{
  filters: ActiveFilter[];
}>();

defineEmits<{
  remove: [field: string];
  'clear-all': [];
}>();

const operatorLabel: Record<ColumnFilterOperator, string> = {
  contains: 'Contiene',
  starts_with: 'Inizia con',
  equals: 'Uguale a',
  not_contains: 'Non contiene',
  is_empty: 'Vuoti',
  is_not_empty: 'Non vuoti',
};

const formatValue = (filter: ActiveFilter) => {
  if (filter.operator === 'is_empty' || filter.operator === 'is_not_empty') {
    return operatorLabel[filter.operator];
  }
  const label = operatorLabel[filter.operator] ?? '';
  return [label, filter.value].filter(Boolean).join(': ');
};
</script>
