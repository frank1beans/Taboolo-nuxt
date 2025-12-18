<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ColDef, RowNode } from 'ag-grid-community';

type GridInputParams = {
  value: unknown;
  colDef: ColDef;
  node: RowNode;
};

const props = defineProps<{ params: GridInputParams }>();

// Initial value
const value = ref(props.params.value);

// Sync from grid to local
watch(() => props.params.value, (newVal) => {
  value.value = newVal;
});

// Sync from local to grid
const onInput = () => {
    // Use AG Grid API to update data - this ensures events fire and reactivity is maintained if bindings are correct
    if (props.params.colDef.field && props.params.node) {
        props.params.node.setDataValue(props.params.colDef.field, value.value);
    }
};

// Start of Added Refresh Logic
const refresh = () => {
    // Return true to tell AG Grid NOT to destroy/re-create this component
    // We handle the update via reactivity (watch / onInput)
    return true;
};

defineExpose({ refresh });
// End of Added Refresh Logic
</script>

<template>
  <div class="h-full w-full flex items-center px-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
    <input
      v-model="value"
      type="text"
      class="w-full bg-transparent border-none outline-none text-sm text-neutral-900 dark:text-white placeholder-neutral-400"
      :placeholder="props.params.colDef?.headerName"
      @input="onInput"
    >
  </div>
</template>
