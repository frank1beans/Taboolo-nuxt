<script setup lang="ts">
import { ref, watch, provide, computed } from 'vue'

export interface TabsProps {
  modelValue?: string
  defaultValue?: string
}

const props = withDefaults(defineProps<TabsProps>(), {
  modelValue: undefined,
  defaultValue: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Internal state for uncontrolled mode
const internalValue = ref(props.defaultValue || '')

// Computed for current active tab
const activeTab = computed({
  get: () => props.modelValue ?? internalValue.value,
  set: (value: string) => {
    internalValue.value = value
    emit('update:modelValue', value)
  },
})

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== undefined) {
      internalValue.value = newValue
    }
  }
)

// Provide context to child components
provide('tabs', {
  activeTab: computed(() => activeTab.value),
  setActiveTab: (value: string) => {
    activeTab.value = value
  },
})
</script>

<template>
  <div class="space-y-4">
    <slot />
  </div>
</template>
