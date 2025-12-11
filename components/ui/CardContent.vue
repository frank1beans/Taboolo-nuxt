<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

export interface CardContentProps {
  class?: string
}

const props = defineProps<CardContentProps>()

const contentClasses = computed(() => cn('p-4 pt-2', props.class))
</script>

<template>
  <div :class="contentClasses">
    <slot />
  </div>
</template>
