<script setup lang="ts">
/**
 * AppShell.vue
 * 
 * Root layout wrapper using CSS Grid for perfect alignment.
 * Supports: [Rail] [LeftSidebar] [Content] [RightSidebar]
 */
import { computed, provide } from 'vue'
import AppTopbar from './AppTopbar.vue'
import AppBottombar from './AppBottombar.vue'

const props = withDefaults(defineProps<{
  sidebarWidth?: number
  sidebarCollapsed?: boolean
  sidebarHidden?: boolean
  rightSidebarWidth?: number
  rightSidebarVisible?: boolean
}>(), {
  sidebarWidth: 260,
  sidebarCollapsed: false,
  sidebarHidden: false,
  rightSidebarWidth: 0,
  rightSidebarVisible: false
})

const emit = defineEmits<{
  'update:sidebarCollapsed': [value: boolean]
  'update:rightSidebarVisible': [value: boolean]
}>()

// Reactive sidebar widths
const leftSidebarWidth = computed(() =>
  Math.max(0, props.sidebarWidth)
)

const rightWidth = computed(() => 
  props.rightSidebarVisible ? props.rightSidebarWidth : 0
)

const railWidth = 64; // Matches var(--rail-width)

// Topbar brand width: stays visible (e.g. 48px) when sidebar collapses
const topbarBrandWidth = computed(() =>
  Math.max(48, props.sidebarWidth)
)

// Provide sidebar state to children
provide('shellState', {
  sidebarCollapsed: computed(() => props.sidebarCollapsed),
  leftSidebarWidth,
  rightSidebarWidth: rightWidth,
  railWidth,
  topbarBrandWidth,
  toggleSidebar: () => emit('update:sidebarCollapsed', !props.sidebarCollapsed),
  toggleRightSidebar: () => emit('update:rightSidebarVisible', !props.rightSidebarVisible)
})

const gridColumns = computed(() => {
  const rail = `${railWidth}px`
  const right = rightWidth.value > 0 ? `${rightWidth.value}px` : '0px'
  
  if (props.sidebarHidden) {
    // When sidebar is hidden: Rail | Content | RightSidebar (3 columns)
    return `${rail} minmax(0, 1fr) ${right}`
  }
  // Normal case: Rail | LeftSidebar | Content | RightSidebar (4 columns)
  const left = `${leftSidebarWidth.value}px`
  return `${rail} ${left} minmax(0, 1fr) ${right}`
})
</script>

<template>
  <div 
    class="app-shell"
    :class="{ 'sidebar-hidden': sidebarHidden }"
    :style="{
      '--rail-width': `${railWidth}px`,
      '--sidebar-width': `${leftSidebarWidth}px`,
      '--sidebar-right-width': `${rightWidth}px`,
      'grid-template-columns': gridColumns
    }"
  >
    <!-- Rail - Spans full height (Row 1-4) -->
    <div class="app-shell-rail">
      <slot name="rail" />
    </div>

    <!-- Topbar - Spans remaining columns (Row 1) -->
    <div class="app-shell-topbar-area">
      <slot name="header">
        <AppTopbar>
          <template #brand>
             <slot name="topbar-brand" />
          </template>
          <template #center>
            <slot name="topbar-center" />
          </template>
          <template #right>
            <slot name="topbar-right" />
          </template>
        </AppTopbar>
      </slot>
    </div>

    <!-- Page Header Portal Area (Row 2, Column 2/-1) -->
    <div id="page-header-portal" class="app-shell-page-header">
       <!-- Content teleported here from pages -->
    </div>

    <!-- Left Sidebar (Context) - Row 3 -->
    <aside v-if="!sidebarHidden" class="app-shell-sidebar-left">
      <div class="app-shell-sidebar-inner">
        <slot name="sidebar" />
      </div>
    </aside>

    <!-- Main ContentWrapper - Row 3 -->
    <div class="app-shell-main">
      <slot />
    </div>

    <!-- Right Sidebar (optional) - Row 3 -->
    <aside 
      v-if="rightSidebarVisible && rightSidebarWidth > 0" 
      class="app-shell-sidebar-right"
    >
      <slot name="sidebar-right" />
    </aside>

    <!-- Bottombar - Row 4 -->
    <div class="app-shell-bottombar-area">
      <AppBottombar>
        <template #left>
          <slot name="bottombar-left" />
        </template>
        <template #center>
          <slot name="bottombar-center" />
        </template>
        <template #right>
          <slot name="bottombar-right" />
        </template>
      </AppBottombar>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  /* Rows: Topbar | PageHeader | Content | Bottombar */
  grid-template-rows: var(--topbar-height, 56px) min-content 1fr var(--bottombar-height, 32px);
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: hsl(var(--background));
}

.app-shell-rail {
  grid-column: 1;
  grid-row: 1 / -1; /* Full height */
  z-index: 50;
  /* Updated to match sidebar background for consistency */
  background: hsl(var(--sidebar-background));
  border-right: 1px solid hsl(var(--sidebar-border));
}

/* Topbar area spans from column 2 to end */
.app-shell-topbar-area {
  grid-column: 2 / -1;
  grid-row: 1;
  z-index: 40;
  height: var(--topbar-height, 56px);
  display: flex;
  align-items: center;
}

/* Page Header area spans from column 2 to end */
.app-shell-page-header {
  grid-column: 2 / -1;
  grid-row: 2;
  z-index: 35;
  min-height: 0; /* allows collapsing if empty? maybe min-height: 0 */
}
/* If empty, min-content is 0. */

.app-shell-sidebar-left {
  grid-column: 2;
  grid-row: 3; /* Below Page Header */
  overflow: hidden;
  height: 100%;
  background: hsl(var(--sidebar-surface, var(--card)));
  border-right: 1px solid hsl(var(--border));
}

.app-shell-sidebar-inner {
  height: 100%;
  overflow: hidden;
}

.app-shell-main {
  grid-column: 3;
  grid-row: 3;
  overflow: hidden;
  min-width: 0;
  position: relative;
}

/* When sidebar is hidden, layout is 3 columns: Rail | Content | Right */
.app-shell.sidebar-hidden .app-shell-main {
  grid-column: 2;
}

.app-shell-sidebar-right {
  grid-column: 4;
  grid-row: 3;
  overflow: hidden;
}

/* Bottombar spans from column 2 to end */
.app-shell-bottombar-area {
  grid-column: 2 / -1;
  grid-row: 4;
  z-index: 40;
}
</style>
