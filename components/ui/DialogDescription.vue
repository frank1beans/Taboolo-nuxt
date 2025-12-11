<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

export interface DialogDescriptionProps {
  class?: string
}

const props = defineProps<DialogDescriptionProps>()

const descriptionClasses = computed(() => cn('text-sm text-muted-foreground', props.class))
</script>

<template>
  <p :class="descriptionClasses">
    <slot />
  </p>
</template>
