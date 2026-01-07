<template>
  <div 
    class="flex items-center gap-2.5 px-3.5 py-2.5 bg-card border border-border rounded-lg transition-all duration-200 group"
    :class="[variantClass, { 'cursor-pointer hover:border-primary/30 hover:shadow-sm': clickable }]"
    @click="clickable && $emit('click')"
  >
    <!-- Icon -->
    <div v-if="icon" class="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-muted-foreground shrink-0 transition-colors group-hover:text-foreground">
      <Icon :name="icon" class="w-4 h-4" />
    </div>
    
    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="text-xl font-bold leading-tight text-foreground tracking-tight">
        {{ kpiDisplayValue }}
      </div>
      <div class="text-xs font-medium uppercase tracking-wide text-muted-foreground mt-0.5">
        {{ label }}
      </div>
    </div>

    <!-- Trend indicator -->
    <div v-if="trend !== undefined" class="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" :class="trendClass">
      <Icon :name="trendIcon" class="w-3 h-3" />
      <span>{{ Math.abs(trend) }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatCurrencyCompact, formatNumber } from '~/lib/formatters'

const props = withDefaults(defineProps<{
  value: number | string
  label: string
  icon?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  trend?: number
  clickable?: boolean
  format?: 'number' | 'currency' | 'percent' | 'none'
}>(), {
  variant: 'default',
  clickable: false,
  format: 'number'
})

defineEmits<{
  click: []
}>()

const kpiDisplayValue = computed(() => {
  if (props.format === 'none' || typeof props.value === 'string') {
    return props.value
  }
  const num = Number(props.value)
  if (props.format === 'currency') {
    return formatCurrencyCompact(num)
  }
  if (props.format === 'percent') {
    return `${formatNumber(num, { minimumFractionDigits: 1, maximumFractionDigits: 1, fallback: '0' })}%`
  }
  return formatNumber(num, { minimumFractionDigits: 0, maximumFractionDigits: 2, fallback: '0' })
})

const variantClass = computed(() => {
  return ''
})

const trendClass = computed(() => {
  if (props.trend === undefined) return ''
  return props.trend > 0 ? 'bg-success-light text-success' : props.trend < 0 ? 'bg-destructive-light text-destructive' : 'bg-muted text-muted-foreground'
})

const trendIcon = computed(() => {
  if (props.trend === undefined) return ''
  return props.trend > 0 ? 'heroicons:arrow-trending-up' : props.trend < 0 ? 'heroicons:arrow-trending-down' : 'heroicons:minus'
})
</script>

<style scoped>
/* Scoped styles to satisfy Tailwind v4 delimeter if needed */
</style>
