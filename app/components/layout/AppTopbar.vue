<script setup lang="ts">
/**
 * AppTopbar.vue
 * 
 * Full-width topbar with 3-section internal grid:
 * - Left: Brand/logo (matches sidebar width)
 * - Center: Breadcrumb, page title, actions
 * - Right: User menu (matches right sidebar width)
 */
import { inject, computed } from 'vue'

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const toggleTheme = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// Get shell state from parent
const shellState = inject('shellState', {
  leftSidebarWidth: computed(() => 280),
  rightSidebarWidth: computed(() => 0),
  topbarBrandWidth: computed(() => 280)
})

const gridColumns = computed(() => {
  // Use independent brand width (allows button to be visible when sidebar is collapsed)
  const left = `${shellState.topbarBrandWidth.value}px`
  const right = shellState.rightSidebarWidth.value > 0 
    ? `${shellState.rightSidebarWidth.value}px` 
    : 'auto'
  return `${left} 1fr ${right}`
})
</script>

<template>
  <header 
    class="grid items-center h-[var(--topbar-height,48px)] bg-card border-b border-border/40 z-40"
    :style="{ 'grid-template-columns': gridColumns }"
  >
    <!-- Left section - Brand (aligned with sidebar) -->
    <div class="flex items-center h-full border-r border-border/30 px-0">
      <slot name="brand">
        <div class="flex items-center gap-2 px-4">
          <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm">
            T
          </div>
          <span class="font-semibold text-foreground tracking-tight">Taboolo</span>
        </div>
      </slot>
    </div>

    <!-- Center section - Breadcrumb, actions -->
    <div class="flex items-center justify-between h-full px-4 min-w-0">
      <slot name="center">
        <!-- Default: empty or breadcrumb -->
      </slot>
    </div>

    <!-- Right section - User menu, theme toggle -->
    <div class="flex items-center justify-end h-full px-3 gap-2 border-l border-border/30" :class="{ 'border-l-0 pl-0': !shellState.rightSidebarWidth.value }">
      <slot name="right">
        <!-- Default theme toggle -->
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggleTheme"
        >
          <Icon :name="isDark ? 'heroicons:sun-20-solid' : 'heroicons:moon-20-solid'" class="h-4 w-4" />
        </button>
      </slot>
    </div>
  </header>
</template>
