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
  <aside class="w-[68px] h-full flex flex-col items-center py-4 bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))] z-50">
    <!-- Logo -->
    <div class="mb-6 flex-shrink-0">
      <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary-700))] text-white shadow-lg cursor-default transition-transform hover:scale-105">
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
          class="group relative flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-200 outline-none"
          :class="[
            item.id === activeNodeId
              ? 'bg-[hsl(var(--primary))] text-white shadow-md'
              : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]'
          ]"
        >
            <!-- Active Indicator Dot (optional, subtle) removed -->

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
         <div class="w-8 h-[1px] mx-auto bg-[hsl(var(--sidebar-border))]"/>
      
      <!-- User Profile Avatar Placeholder -->
      <UTooltip text="Profile" placement="right">
          <div class="w-10 h-10 mx-auto rounded-full bg-[hsl(var(--sidebar-accent))] border border-[hsl(var(--sidebar-border))] flex items-center justify-center text-xs font-bold text-[hsl(var(--sidebar-foreground))] cursor-pointer hover:ring-2 hover:ring-[hsl(var(--primary)/0.5)] transition-all">
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
