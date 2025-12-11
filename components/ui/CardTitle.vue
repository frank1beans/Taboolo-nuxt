<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

export interface CardTitleProps {
  class?: string
}

const props = defineProps<CardTitleProps>()

const titleClasses = computed(() =>
  cn('text-base font-semibold tracking-tight text-card-foreground', props.class)
)
</script>

<template>
  <h3 :class="titleClasses">
    <slot />
  </h3>
</template>
