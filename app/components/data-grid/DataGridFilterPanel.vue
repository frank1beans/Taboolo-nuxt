<template>
  <div
    v-if="panel"
    class="absolute z-30"
    :style="{
      top: `${panel.top}px`,
      left: `${panel.left}px`,
      width: `${panel.width}px`,
      maxHeight: `${panel.height}px`,
    }"
  >
    <div class="bg-white border border-slate-300 rounded shadow-xl text-sm resize overflow-auto min-w-[220px] max-w-[320px]">
      <div class="px-3 py-2 font-semibold border-b border-slate-200 flex items-center justify-between">
        <span>{{ panel.label }}</span>
        <UButton
          icon="i-heroicons-x-mark"
          size="2xs"
          variant="ghost"
          color="gray"
          @click="$emit('close')"
        />
      </div>
      <div class="max-h-[320px] overflow-y-auto">
        <button
          class="w-full text-left px-3 py-2 hover:bg-slate-100 text-xs border-b border-slate-100"
          type="button"
          @click="$emit('apply-filter', panel.field, null, 'equals')"
        >
          (Seleziona Tutto)
        </button>
        <button
          class="w-full text-left px-3 py-2 hover:bg-slate-100 text-xs border-b border-slate-100"
          type="button"
          @click="$emit('apply-filter', panel.field, '', 'blank')"
        >
          (Vuoti)
        </button>
        <button
          class="w-full text-left px-3 py-2 hover:bg-slate-100 text-xs border-b border-slate-100"
          type="button"
          @click="$emit('apply-filter', panel.field, '¬¬', 'notBlank')"
        >
          (Non Vuoti)
        </button>
        <button
          v-for="opt in panel.options"
          :key="opt"
          class="w-full text-left px-3 py-2 hover:bg-slate-100 text-xs"
          type="button"
          @click="$emit('apply-filter', panel.field, opt, 'equals')"
        >
          {{ opt }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FilterPanelState } from '~/types/data-grid';

defineProps<{
  panel: FilterPanelState | null;
}>();

defineEmits<{
  'apply-filter': [field: string, value: string | null, mode: 'equals' | 'blank' | 'notBlank'];
  close: [];
}>();
</script>
