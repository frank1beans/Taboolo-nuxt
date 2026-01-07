<script setup lang="ts">
import { computed } from 'vue'
import { useColorMode } from '#imports'
import { formatCurrency } from '~/lib/formatters'

interface Props {
  current: number
  total: number
}

const props = defineProps<Props>()
const colorMode = useColorMode()

const isFiltered = computed(() => {
  // Use a small epsilon for float comparison logic, though ideally we work with cents
  return Math.abs(props.current - props.total) > 0.01
})

const percentage = computed(() => {
  if (!props.total) return 100
  return ((props.current / props.total) * 100).toFixed(1)
})
</script>

<template>
  <div
    :class="[
      'flex items-center gap-3 px-4 py-1.5 rounded-lg border transition-all duration-200',
      colorMode.value === 'dark'
        ? 'bg-[hsl(var(--success)/0.15)] border-[hsl(var(--success)/0.3)]'
        : 'bg-[hsl(var(--success-light))] border-[hsl(var(--success)/0.2)]'
    ]"
  >
    <!-- Icon Container -->
    <div 
      class="flex items-center justify-center w-8 h-8 rounded-full bg-[hsl(var(--success)/0.2)] text-[hsl(var(--success))]"
    >
      <Icon name="heroicons:currency-euro" class="w-5 h-5" />
    </div>
    
    <!-- Values -->
    <div class="flex flex-col items-end leading-none">
      
      <!-- Scenario A: Filtered View -->
      <template v-if="isFiltered">
         <!-- Main Value: Current Filtered Amount -->
         <div class="font-bold text-xl text-[hsl(var(--success))] tabular-nums">
            {{ formatCurrency(current) }}
         </div>
         
         <!-- Sub Value: Total Context -->
         <div class="text-xs font-medium text-[hsl(var(--success))] opacity-70 mt-0.5 tabular-nums">
            {{ percentage }}% di {{ formatCurrency(total) }}
         </div>
      </template>

      <!-- Scenario B: Full View -->
      <template v-else>
         <!-- Label or just spacing? Let's keep it clean with just the number for now, or a label 'Totale' -->
         <div class="text-[10px] uppercase tracking-wider font-bold text-[hsl(var(--success))] opacity-60 mb-0.5">
            Totale
         </div>
         <div class="font-bold text-xl text-[hsl(var(--success))] tabular-nums">
            {{ formatCurrency(current) }}
         </div>
      </template>

    </div>
  </div>
</template>
