<script setup lang="ts">
/**
 * AppBottombar.vue
 * 
 * Minimal bottombar with 3-section grid aligned with sidebars:
 * - Left: Status indicators (connection, sync)
 * - Center: Context info
 * - Right: Version, help
 */
import { inject, computed } from 'vue'

// App version (could be from env in real app)
const appVersion = 'v1.0.0'

// Get shell state from parent
const shellState = inject('shellState', {
  leftSidebarWidth: computed(() => 280),
  rightSidebarWidth: computed(() => 0)
})

// Decoupled from sidebar width to keep breadcrumb visible even when sidebar collapses
const gridColumns = computed(() => {
  const right = shellState.rightSidebarWidth.value > 0 
    ? `${shellState.rightSidebarWidth.value}px` 
    : 'auto'
  // Use auto for the left status area instead of binding to sidebar width
  return `auto 1fr ${right}`
})
</script>

<template>
  <footer 
    class="app-bottombar"
    :style="{ 'grid-template-columns': gridColumns }"
  >
    <!-- Left section - Status (aligned with sidebar) -->
    <div class="app-bottombar-left">
      <slot name="left">
        <div class="flex items-center gap-2 px-4 text-[10px] text-[hsl(var(--muted-foreground))]">
          <span class="flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
            Online
          </span>
        </div>
      </slot>
    </div>

    <!-- Center section -->
    <div class="app-bottombar-center">
      <slot name="center">
        <!-- Empty by default -->
      </slot>
    </div>

    <!-- Right section - Version, help -->
    <div class="app-bottombar-right">
      <slot name="right">
        <span class="text-[10px] text-[hsl(var(--muted-foreground))]">{{ appVersion }}</span>
      </slot>
    </div>
  </footer>
</template>

<style scoped>
.app-bottombar {
  display: grid;
  align-items: center;
  height: var(--bottombar-height, 32px);
  background: hsl(var(--card));
  border-top: 1px solid hsl(var(--border) / 0.3);
  z-index: 40;
}

.app-bottombar-left {
  display: flex;
  align-items: center;
  height: 100%;
  border-right: 1px solid hsl(var(--border) / 0.2);
}

.app-bottombar-center {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 1rem;
  min-width: 0;
}

.app-bottombar-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  padding: 0 0.75rem;
  gap: 0.5rem;
  border-left: 1px solid hsl(var(--border) / 0.2);
}

/* When right sidebar is not present */
.app-bottombar-right:empty {
  border-left: none;
  padding: 0;
}
</style>
