<script setup lang="ts">
import { computed } from 'vue'
import { UIcon } from '#components'

export interface CheckboxProps {
  checked?: boolean | 'indeterminate'
  disabled?: boolean
  id?: string
  name?: string
  value?: string
}

const props = withDefaults(defineProps<CheckboxProps>(), {
  checked: false,
  disabled: false,
  id: '',
  name: '',
  value: '',
})

const emit = defineEmits<{
  'update:checked': [value: boolean]
}>()

const isChecked = computed(() => props.checked === true)
const isIndeterminate = computed(() => props.checked === 'indeterminate')

const handleClick = () => {
  if (props.disabled) return
  emit('update:checked', !isChecked.value)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (props.disabled) return
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    emit('update:checked', !isChecked.value)
  }
}
</script>

<template>
  <button
    type="button"
    role="checkbox"
    :aria-checked="isIndeterminate ? 'mixed' : isChecked"
    :aria-disabled="disabled"
    :disabled="disabled"
    :data-state="isIndeterminate ? 'indeterminate' : isChecked ? 'checked' : 'unchecked'"
    class="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150"
    :class="{
      'bg-primary text-primary-foreground': isChecked || isIndeterminate,
      'bg-background': !isChecked && !isIndeterminate,
      'hover:bg-primary/10': !disabled && !isChecked && !isIndeterminate,
    }"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <span class="flex items-center justify-center text-current">
      <UIcon v-if="isChecked" name="i-lucide-check" class="h-3 w-3" />
      <UIcon v-else-if="isIndeterminate" name="i-lucide-minus" class="h-3 w-3" />
    </span>
  </button>
</template>
