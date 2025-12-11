<script setup lang="ts">
import { inject, computed, type Ref } from 'vue'
import { UIcon } from '#components'

export interface RadioGroupItemProps {
  value: string | number | boolean
  id?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<RadioGroupItemProps>(), {
  disabled: false,
  id: '',
})

interface RadioGroupContext {
  modelValue: Ref<string | number | boolean | undefined>
  name: Ref<string | undefined>
  disabled: Ref<boolean>
  onChange: (value: string | number | boolean) => void
}

const radioGroup = inject<RadioGroupContext>('radioGroup', {
  modelValue: computed(() => undefined),
  name: computed(() => undefined),
  disabled: computed(() => false),
  onChange: () => {},
})

const isChecked = computed(() => radioGroup.modelValue.value === props.value)
const isDisabled = computed(() => props.disabled || radioGroup.disabled.value)

const handleClick = () => {
  if (isDisabled.value) return
  radioGroup.onChange(props.value)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (isDisabled.value) return
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    radioGroup.onChange(props.value)
  }
}
</script>

<template>
  <button
    :id="id"
    type="button"
    role="radio"
    :aria-checked="isChecked"
    :aria-disabled="isDisabled"
    :disabled="isDisabled"
    :data-state="isChecked ? 'checked' : 'unchecked'"
    class="aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150"
    :class="{
      'bg-background': !isChecked,
      'bg-primary border-primary': isChecked,
      'hover:bg-primary/10': !isDisabled && !isChecked,
    }"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <span class="flex items-center justify-center">
      <UIcon
        v-if="isChecked"
        name="i-lucide-circle"
        class="h-2 w-2 fill-primary-foreground text-primary-foreground"
      />
    </span>
  </button>
</template>
