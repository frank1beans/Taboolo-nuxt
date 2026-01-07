<script setup lang="ts">
import type { TreeNode } from '~/composables/useProjectTree'

// Define props to match what default.vue provides.
defineProps<{
  nodes: TreeNode[]
  activeNodeId?: string
}>()

const sanitizeTo = (to?: string) => {
  if (!to) return undefined
  if (to.includes('/null') || to.includes('/undefined')) return undefined
  return to
}
</script>

<template>
  <aside class="h-full flex flex-col items-center py-4 bg-sidebar border-r border-sidebar-border z-50">
    <!-- Logo -->
    <div class="mb-6 flex-shrink-0">
      <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-700 text-white shadow-lg cursor-default transition-transform hover:scale-105">
        <UIcon name="i-heroicons-cube-transparent" class="w-6 h-6" />
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 w-full px-2 space-y-3 overflow-y-auto overflow-x-hidden scrollbar-thin">
      <UTooltip
        v-for="item in nodes"
        :key="item.id"
        :text="item.label"
        placement="right"
        :popper="{ placement: 'right', offsetDistance: 12 }"
      >
        <NuxtLink
          v-if="sanitizeTo(item.to)"
          :to="sanitizeTo(item.to)"
          class="group relative flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1"
          :class="[
            item.id === activeNodeId
              ? 'bg-primary text-white shadow-md'
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          ]"
        >
          <Icon
            v-if="item.icon"
            :name="item.icon"
            class="w-5 h-5 transition-transform duration-200 group-hover:scale-110"
          />
        </NuxtLink>
      </UTooltip>
    </nav>

    <!-- Bottom Actions -->
    <div class="mt-4 px-2 space-y-3 flex-shrink-0">
         <div class="w-8 h-[1px] mx-auto bg-sidebar-border"/>
      
      <!-- User Profile Avatar Placeholder -->
      <UTooltip text="Profile" placement="right">
          <div class="w-10 h-10 mx-auto rounded-full bg-sidebar-accent border border-sidebar-border flex items-center justify-center text-xs font-bold text-sidebar-foreground cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
            FB
          </div>
      </UTooltip>
    </div>
  </aside>
</template>

<style scoped>
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--sidebar-border)) transparent;
}
</style>
