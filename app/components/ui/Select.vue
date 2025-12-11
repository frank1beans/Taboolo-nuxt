<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '~/lib/utils'
import { UIcon } from '#components'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectProps {
  modelValue?: string | number | null
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  class?: string
}

const props = withDefaults(defineProps<SelectProps>(), {
  modelValue: null,
  placeholder: 'Seleziona...',
  disabled: false,
  class: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null]
}>()

const selectClasses = computed(() =>
  cn(
    'flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    '[&>span]:line-clamp-1',
    props.class
  )
)

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const value = target.value === '' ? null : target.value
  // Try to convert to number if the original value was a number
  const numValue = Number(value)
  const finalValue = !isNaN(numValue) && value !== '' ? numValue : value
  emit('update:modelValue', finalValue)
}
</script>

<template>
  <div class="relative">
    <select
      :value="modelValue ?? ''"
      :disabled="disabled"
      :class="selectClasses"
      @change="handleChange"
    >
      <option value="">{{ placeholder }}</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
    </select>
    <UIcon
      name="i-lucide-chevron-down"
      class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
    />
  </div>
</template>

<style scoped>
select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}
</style>
