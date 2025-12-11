<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '~/lib/utils'

export interface DialogTitleProps {
  class?: string
}

const props = defineProps<DialogTitleProps>()

const titleClasses = computed(() =>
  cn('text-lg font-semibold leading-none tracking-tight', props.class)
)
</script>

<template>
  <h2 :class="titleClasses">
    <slot />
  </h2>
</template>
