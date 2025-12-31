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
    class="app-topbar"
    :style="{ 'grid-template-columns': gridColumns }"
  >
    <!-- Left section - Brand (aligned with sidebar) -->
    <div class="app-topbar-brand">
      <slot name="brand">
        <div class="flex items-center gap-2 px-4">
          <div class="w-8 h-8 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center text-[hsl(var(--primary-foreground))] font-bold text-sm shadow-sm">
            T
          </div>
          <span class="font-semibold text-[hsl(var(--foreground))] tracking-tight">Taboolo</span>
        </div>
      </slot>
    </div>

    <!-- Center section - Breadcrumb, actions -->
    <div class="app-topbar-center">
      <slot name="center">
        <!-- Default: empty or breadcrumb -->
      </slot>
    </div>

    <!-- Right section - User menu, theme toggle -->
    <div class="app-topbar-right">
      <slot name="right">
        <!-- Default theme toggle -->
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggleTheme"
        >
          <Icon :name="isDark ? 'heroicons:sun-20-solid' : 'heroicons:moon-20-solid'" class="h-4 w-4" />
        </button>
      </slot>
    </div>
  </header>
</template>

<style scoped>
.app-topbar {
  display: grid;
  align-items: center;
  height: var(--topbar-height, 48px);
  background: hsl(var(--card));
  border-bottom: 1px solid hsl(var(--border) / 0.4);
  z-index: 40;
}

.app-topbar-brand {
  display: flex;
  align-items: center;
  height: 100%;
  border-right: 1px solid hsl(var(--border) / 0.3);
}

.app-topbar-center {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 1rem;
  min-width: 0;
}

.app-topbar-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  padding: 0 0.75rem;
  gap: 0.5rem;
  border-left: 1px solid hsl(var(--border) / 0.3);
}

/* When right sidebar is not present, remove border */
.app-topbar-right:empty {
  border-left: none;
  padding: 0;
}
</style>
