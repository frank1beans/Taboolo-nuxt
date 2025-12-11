<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '~/lib/utils'

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
  class?: string
}

const props = withDefaults(defineProps<SeparatorProps>(), {
  orientation: 'horizontal',
  decorative: true,
  class: '',
})

const separatorClasses = computed(() =>
  cn(
    'shrink-0 bg-border',
    props.orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
    props.class
  )
)

const role = computed(() => (props.decorative ? 'none' : 'separator'))
const ariaOrientation = computed(() =>
  props.orientation === 'vertical' ? 'vertical' : undefined
)
</script>

<template>
  <div :class="separatorClasses" :role="role" :aria-orientation="ariaOrientation" />
</template>
