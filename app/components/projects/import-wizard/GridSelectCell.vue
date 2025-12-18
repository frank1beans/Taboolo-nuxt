<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { ColDef, RowNode } from 'ag-grid-community';

type GridSelectParams = {
  value: unknown;
  values: unknown[] | ((params: GridSelectParams) => unknown[]);
  colDef: ColDef;
  node: RowNode;
  onValueChange?: (value: unknown, params: GridSelectParams) => void;
};

const props = defineProps<{ params: GridSelectParams }>();

const value = ref(props.params.value);

// Retrieve options from params. These can be direct values or a function returning values
const options = computed(() => {
    const vals = props.params.values;
    if (typeof vals === 'function') {
        return vals(props.params);
    }
    return vals || [];
});

watch(() => props.params.value, (newVal) => {
  value.value = newVal;
});

const onChange = (e: Event) => {
    const val = (e.target as HTMLSelectElement).value;
    value.value = val;
    
    if (props.params.colDef.field && props.params.node) {
        props.params.node.setDataValue(props.params.colDef.field, val);
        
        // Call explicit callback if provided
        if (props.params.onValueChange) {
            props.params.onValueChange(val, props.params);
        }
    }
};

const refresh = () => true;
defineExpose({ refresh });
</script>

<template>
  <div class="relative h-full w-full hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
    <select
      :value="value"
      class="w-full h-full pl-3 pr-10 bg-transparent border-none outline-none text-sm text-neutral-900 dark:text-white appearance-none cursor-pointer"
      @change="onChange"
    >
      <option 
        v-for="opt in options" 
        :key="opt" 
        :value="opt"
        class="bg-white text-neutral-900 dark:bg-neutral-800 dark:text-white"
      >
        {{ opt }}
      </option>
    </select>
    <div class="pointer-events-none absolute inset-y-0 right-2 flex items-center px-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-neutral-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
    </div>
  </div>
</template>
