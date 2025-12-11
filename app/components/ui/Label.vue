<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '~/lib/utils'

export interface LabelProps {
  for?: string
  class?: string
}

const props = withDefaults(defineProps<LabelProps>(), {
  for: undefined,
  class: '',
})

const labelClasses = computed(() =>
  cn(
    'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
    props.class
  )
)
</script>

<template>
  <label :for="props.for" :class="labelClasses">
    <slot />
  </label>
</template>
