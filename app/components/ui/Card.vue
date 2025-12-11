<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '~/lib/utils'

export interface CardProps {
  variant?: 'default' | 'elevated' | 'interactive' | 'stat' | 'ghost'
  class?: string
}

const props = withDefaults(defineProps<CardProps>(), {
  variant: 'default',
  class: '',
})

const cardClasses = computed(() => {
  const baseClasses =
    'rounded-[var(--radius-lg)] border border-border/25 bg-card text-card-foreground shadow-[var(--shadow-xs)] transition-colors'

  const variantClasses = {
    default: '',
    elevated: 'shadow-[var(--shadow-sm)]',
    interactive: 'hover:border-primary/50 hover:shadow-[var(--shadow-sm)] cursor-pointer',
    stat: 'bg-gradient-subtle shadow-[var(--shadow-sm)]',
    ghost: 'border-0 bg-transparent shadow-none',
  }

  return cn(baseClasses, variantClasses[props.variant], props.class)
})
</script>

<template>
  <div :class="cardClasses">
    <slot />
  </div>
</template>
