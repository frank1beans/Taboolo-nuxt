<script setup lang="ts">
import { inject, computed, type Ref } from 'vue'

export interface TabsContentProps {
  value: string
  class?: string
}

const props = withDefaults(defineProps<TabsContentProps>(), {
  class: '',
})

interface TabsContext {
  activeTab: Ref<string>
  setActiveTab: (value: string) => void
}

const tabs = inject<TabsContext>('tabs', {
  activeTab: computed(() => ''),
  setActiveTab: () => {},
})

const isActive = computed(() => tabs.activeTab.value === props.value)
</script>

<template>
  <div
    v-if="isActive"
    role="tabpanel"
    :data-state="isActive ? 'active' : 'inactive'"
    class="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    :class="props.class"
  >
    <slot />
  </div>
</template>
