<script setup lang="ts">
import { inject, computed, type Ref } from 'vue'

export interface TabsTriggerProps {
  value: string
  disabled?: boolean
  class?: string
}

const props = withDefaults(defineProps<TabsTriggerProps>(), {
  disabled: false,
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

const handleClick = () => {
  if (!props.disabled) {
    tabs.setActiveTab(props.value)
  }
}
</script>

<template>
  <Ubutton
    type="button"
    role="tab"
    :aria-selected="isActive"
    :aria-disabled="disabled"
    :disabled="disabled"
    :data-state="isActive ? 'active' : 'inactive'"
    class="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    :class="[
      isActive
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:bg-muted/50',
      props.class,
    ]"
    @click="handleClick"
  >
    <slot />
  </Ubutton>
</template>
