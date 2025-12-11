<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

export interface CardHeaderProps {
  class?: string
}

const props = defineProps<CardHeaderProps>()

const headerClasses = computed(() => cn('flex flex-col space-y-2 p-4', props.class))
</script>

<template>
  <div :class="headerClasses">
    <slot />
  </div>
</template>
