<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ColDef, RowNode } from 'ag-grid-community';

type GridNumberParams = {
  value: unknown;
  colDef: ColDef;
  node: RowNode;
};

const props = defineProps<{ params: GridNumberParams }>();

// Initial value
const value = ref(props.params.value);

// Sync from grid to local
watch(() => props.params.value, (newVal) => {
  value.value = newVal;
});

// Sync from local to grid
const onInput = () => {
    // Parse as number if needed, but keeping as string/number is fine for now usually
    // But for round/numbers better to store as number if possible
    const val = value.value === '' ? null : Number(value.value);
    
    if (props.params.colDef.field) {
        props.params.node.setDataValue(props.params.colDef.field, val);
    }
};
</script>

<template>
  <div class="h-full flex items-center -mx-3 px-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
    <input
      v-model="value"
      type="number"
      class="w-full bg-transparent border-none outline-none text-sm text-neutral-900 dark:text-white placeholder-neutral-400"
      :placeholder="props.params.colDef?.headerName"
      @input="onInput"
      @click.stop 
    >
  </div>
</template>

<style scoped>
/* Hide spinner for number input if desired, but default is fine */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}
</style>
