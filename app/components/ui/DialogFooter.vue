<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '~/lib/utils'

export interface DialogFooterProps {
  class?: string
}

const props = defineProps<DialogFooterProps>()

const footerClasses = computed(() =>
  cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', props.class)
)
</script>

<template>
  <div :class="footerClasses">
    <slot />
  </div>
</template>
