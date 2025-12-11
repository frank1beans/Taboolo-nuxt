<script setup lang="ts">
export interface TabsListProps {
  class?: string
}

const props = withDefaults(defineProps<TabsListProps>(), {
  class: '',
})
</script>

<template>
  <div
    class="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground"
    :class="props.class"
    role="tablist"
  >
    <slot />
  </div>
</template>
