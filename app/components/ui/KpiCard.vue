<template>
  <div 
    class="kpi-card group"
    :class="[variantClass, { 'kpi-card--clickable': clickable }]"
    @click="clickable && $emit('click')"
  >
    <!-- Icon -->
    <div v-if="icon" class="kpi-card__icon">
      <Icon :name="icon" class="w-4 h-4" />
    </div>
    
    <!-- Content -->
    <div class="kpi-card__content">
      <div class="kpi-card__value">
        {{ formattedValue }}
      </div>
      <div class="kpi-card__label">
        {{ label }}
      </div>
    </div>

    <!-- Trend indicator -->
    <div v-if="trend !== undefined" class="kpi-card__trend" :class="trendClass">
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

const formattedValue = computed(() => {
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

const variantClass = computed(() => `kpi-card--${props.variant}`)

const trendClass = computed(() => {
  if (props.trend === undefined) return ''
  return props.trend > 0 ? 'kpi-card__trend--up' : props.trend < 0 ? 'kpi-card__trend--down' : 'kpi-card__trend--neutral'
})

const trendIcon = computed(() => {
  if (props.trend === undefined) return ''
  return props.trend > 0 ? 'heroicons:arrow-trending-up' : props.trend < 0 ? 'heroicons:arrow-trending-down' : 'heroicons:minus'
})
</script>

<style scoped>
.kpi-card {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: var(--kpi-card-padding, 0.625rem 0.875rem);
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius-lg);
  transition: var(--transition-smooth);
}

.kpi-card--clickable {
  cursor: pointer;
}

.kpi-card--clickable:hover {
  border-color: hsl(var(--primary) / 0.3);
  box-shadow: var(--shadow-sm);
}

.kpi-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--radius-md);
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.kpi-card__content {
  flex: 1;
  min-width: 0;
}

.kpi-card__value {
  font-size: var(--kpi-value-size, 1.25rem);
  font-weight: 700;
  line-height: 1.1;
  color: hsl(var(--foreground));
  letter-spacing: -0.02em;
}

.kpi-card__label {
  font-size: var(--kpi-label-size, 0.65rem);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(var(--muted-foreground));
  margin-top: 0.125rem;
}

.kpi-card__trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-full);
}

.kpi-card__trend--up {
  background: hsl(var(--success-light));
  color: hsl(var(--success));
}

.kpi-card__trend--down {
  background: hsl(var(--destructive-light));
  color: hsl(var(--destructive));
}

.kpi-card__trend--neutral {
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

/* Variants */
.kpi-card--success .kpi-card__icon {
  background: hsl(var(--success-light));
  color: hsl(var(--success));
}

.kpi-card--warning .kpi-card__icon {
  background: hsl(var(--warning-light));
  color: hsl(var(--warning));
}

.kpi-card--danger .kpi-card__icon {
  background: hsl(var(--destructive-light));
  color: hsl(var(--destructive));
}

.kpi-card--info .kpi-card__icon {
  background: hsl(var(--info-light));
  color: hsl(var(--info));
}
</style>
