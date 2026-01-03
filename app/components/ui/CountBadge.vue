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
  /** The count to display */
  count: number;
  /** Optional label after the count */
  label?: string;
  /** Optional icon before the count */
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
    neutral: 'ring-[hsl(var(--border)/0.5)]',
    primary: 'ring-[hsl(var(--primary)/0.2)]',
    success: 'ring-[hsl(var(--success)/0.2)]',
    warning: 'ring-[hsl(var(--warning)/0.2)]',
    destructive: 'ring-[hsl(var(--destructive)/0.2)]',
    info: 'ring-[hsl(var(--info)/0.2)]',
  };
  return map[props.color];
});

const sizeClasses = computed(() => {
  const map: Record<string, string> = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };
  return map[props.size];
});
</script>

<template>
  <UBadge 
    variant="subtle" 
    :color="(badgeColor as any)"
    :class="['rounded-full ring-1', ringClass, sizeClasses]"
  >
    <Icon 
      v-if="icon" 
      :name="icon" 
      class="w-3.5 h-3.5 mr-1.5 opacity-70" 
    />
    <span class="font-semibold">{{ count }}</span>
    <span v-if="label" class="ml-1 text-micro uppercase tracking-wider opacity-60 font-bold">
      {{ label }}
    </span>
  </UBadge>
</template>
