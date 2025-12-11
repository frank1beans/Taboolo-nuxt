<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

export interface DialogHeaderProps {
  class?: string
}

const props = defineProps<DialogHeaderProps>()

const headerClasses = computed(() =>
  cn('flex flex-col space-y-1.5 text-center sm:text-left', props.class)
)
</script>

<template>
  <div :class="headerClasses">
    <slot />
  </div>
</template>
