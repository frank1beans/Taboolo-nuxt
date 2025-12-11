<script setup lang="ts">
import { computed, provide } from 'vue'

export interface RadioGroupProps {
  modelValue?: string | number | boolean
  name?: string
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<RadioGroupProps>(), {
  modelValue: undefined,
  name: '',
  disabled: false,
  required: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | boolean]
}>()

// Provide context to radio items
provide('radioGroup', {
  modelValue: computed(() => props.modelValue),
  name: computed(() => props.name),
  disabled: computed(() => props.disabled),
  onChange: (value: string | number | boolean) => {
    emit('update:modelValue', value)
  },
})
</script>

<template>
  <div role="radiogroup" :aria-required="required" class="space-y-2">
    <slot />
  </div>
</template>
