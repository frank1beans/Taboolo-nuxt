<template>
  <div class="border-t border-slate-200 bg-white px-3 py-2">
    <div class="text-xs uppercase tracking-wide text-slate-500 mb-1 flex items-center justify-between">
      <span>Filtri attivi</span>
      <UButton
        v-if="filters.length"
        color="gray"
        variant="ghost"
        size="xs"
        @click="$emit('clear-all')"
      >
        Pulisci tutti
      </UButton>
    </div>
    <div v-if="filters.length" class="flex flex-wrap gap-2">
      <UBadge
        v-for="f in filters"
        :key="f.field"
        color="primary"
        variant="solid"
        class="text-xs"
      >
        <span class="font-semibold">{{ f.label }}:</span> {{ f.value }}
        <UButton
          icon="i-heroicons-x-mark"
          color="white"
          variant="ghost"
          size="2xs"
          class="ml-1"
          @click="$emit('remove', f.field)"
        />
      </UBadge>
    </div>
    <div v-else class="text-sm text-slate-500">Nessun filtro applicato.</div>
  </div>
</template>

<script setup lang="ts">
import type { ActiveFilter } from '~/types/data-grid';

defineProps<{
  filters: ActiveFilter[];
}>();

defineEmits<{
  remove: [field: string];
  'clear-all': [];
}>();
</script>
