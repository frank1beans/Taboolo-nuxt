<script setup lang="ts">
/**
 * CountBadge - Rounded pill for displaying counters
 * 
 * Use for displaying counts with optional labels and icons.
 * Examples: "42 Totali", "5 Outliers", "12 In corso"
 */
import { computed } from 'vue';

type CountBadgeColor = 'neutral' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';

const props = withDefaults(defineProps<{
  /** The value to display */
  value: string | number;
  /** Optional label after the value */
  label?: string;
  /** Optional icon before the value */
  icon?: string;
  /** Badge color variant */
  color?: CountBadgeColor;
  /** Badge size */
  size?: 'xs' | 'sm' | 'md';
}>(), {
  color: 'neutral',
  size: 'sm',
});

// Map color prop to UBadge color and ring color
const badgeColor = computed(() => {
  const map: Record<CountBadgeColor, string> = {
    neutral: 'neutral',
    primary: 'primary',
    success: 'success',
    warning: 'warning',
    destructive: 'error',
    info: 'info',
  };
  return map[props.color];
});

const ringClass = computed(() => {
  const map: Record<CountBadgeColor, string> = {
    neutral: 'ring-[hsl(var(--border)/0.5)] shadow-sm',
    primary: 'ring-[hsl(var(--primary)/0.2)] shadow-sm shadow-[hsl(var(--primary)/0.1)]',
    success: 'ring-[hsl(var(--success)/0.2)] shadow-sm shadow-[hsl(var(--success)/0.1)]',
    warning: 'ring-[hsl(var(--warning)/0.2)] shadow-sm shadow-[hsl(var(--warning)/0.1)]',
    destructive: 'ring-[hsl(var(--destructive)/0.2)] shadow-sm shadow-[hsl(var(--error)/0.1)]',
    info: 'ring-[hsl(var(--info)/0.2)] shadow-sm shadow-[hsl(var(--info)/0.1)]',
  };
  return map[props.color];
});

const sizeClasses = computed(() => {
  const map: Record<string, string> = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-1.5 text-sm',
  };
  return map[props.size];
});
</script>

<template>
  <UBadge 
    variant="subtle" 
    :color="(badgeColor as any)"
    :class="['rounded-full ring-1 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]', ringClass, sizeClasses]"
  >
    <Icon 
      v-if="icon" 
      :name="icon" 
      class="w-3.5 h-3.5 mr-2 opacity-80" 
    />
    <span class="font-bold tracking-tight">{{ value }}</span>
    <span v-if="label" class="ml-1.5 text-[9px] uppercase tracking-widest opacity-70 font-black">
      {{ label }}
    </span>
  </UBadge>
</template>
