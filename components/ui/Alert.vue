<script setup lang="ts">
import { computed } from 'vue'

export interface AlertProps {
  variant?: 'default' | 'destructive' | 'warning' | 'success'
  class?: string
}

const props = withDefaults(defineProps<AlertProps>(), {
  variant: 'default',
  class: '',
})

const alertClasses = computed(() => {
  const base = 'relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg+div]:translate-y-[-3px] [&>svg~*]:pl-7'

  const variants = {
    default: 'bg-background text-foreground border-border',
    destructive:
      'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
    warning: 'border-yellow-500/50 text-yellow-900 dark:text-yellow-100 bg-yellow-50 dark:bg-yellow-950/20 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-500',
    success: 'border-green-500/50 text-green-900 dark:text-green-100 bg-green-50 dark:bg-green-950/20 [&>svg]:text-green-600 dark:[&>svg]:text-green-500',
  }

  return [base, variants[props.variant], props.class].filter(Boolean).join(' ')
})
</script>

<template>
  <div role="alert" :class="alertClasses">
    <slot />
  </div>
</template>
