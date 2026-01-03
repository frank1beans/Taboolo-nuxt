<script setup lang="ts">
/**
 * SidebarShell.vue
 * 
 * Main container for the modular sidebar system.
 * Renders navigation and the active module component.
 * Includes collapse/expand and resize functionality.
 */
import { ref, onUnmounted, computed, unref } from 'vue'
import { useSidebarModules } from '~/composables/useSidebarModules'
import { useSidebarLayout } from '~/composables/useSidebarLayout'

// Sidebar module composable
const { 
  modules, 
  activeModuleId, 
  activeModule, 
  setActiveModule
} = useSidebarModules()

// Layout composable for collapse state
const { isCollapsed, width, minWidth, maxWidth, collapsedWidth, toggleCollapsed, setWidth } = useSidebarLayout()

const activeModuleProps = computed<Record<string, unknown>>(() => {
  const props = activeModule.value?.props
  if (!props) return {}
  const resolved: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    resolved[key] = unref(value)
  }
  return resolved
})

// Resize state
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartWidth = ref(0)

// Resize handlers
const startResize = (e: MouseEvent) => {
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartWidth.value = width.value
  document.addEventListener('mousemove', handleDragging)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const handleDragging = (e: MouseEvent) => {
  if (!isDragging.value) return
  const delta = e.clientX - dragStartX.value
  const newWidth = Math.max(minWidth, Math.min(maxWidth, dragStartWidth.value + delta))
  setWidth(newWidth)
}

const stopResize = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleDragging)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onUnmounted(() => {
  document.removeEventListener('mousemove', handleDragging)
  document.removeEventListener('mouseup', stopResize)
})

</script>

<template>
    <aside 
      v-if="modules.length > 0"
      class="sidebar-shell h-full flex flex-col bg-[hsl(var(--sidebar-surface))] text-[hsl(var(--foreground))] relative transition-all duration-200"
      :class="{ dragging: isDragging }"
      :style="{ 
        width: `${width}px`,
        minWidth: `${isCollapsed ? collapsedWidth : minWidth}px`,
        maxWidth: `${isCollapsed ? collapsedWidth : maxWidth}px`
      }"
    >
      <div class="h-full flex flex-col">
        <!-- Module Navigation (folder tabs or icons) -->
        <SidebarModuleNav
          v-if="modules.length > 0"
          :modules="modules"
          :active-module-id="activeModuleId"
          :collapsed="isCollapsed"
          @select="setActiveModule"
        />

        <!-- Active Module Content (only when expanded) -->
        <div
          v-if="!isCollapsed"
          class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
          :style="{
            paddingTop: 'var(--workspace-header-offset)',
            paddingLeft: 'var(--workspace-gutter-x)',
            paddingRight: 'var(--workspace-gutter-x)',
          }"
        >
          <component 
            :is="activeModule.component"
            v-if="activeModule"
            v-bind="activeModuleProps"
            :key="activeModule.id"
          />
        </div>

        <!-- Collapse Toggle (bottom) -->
        <div class="flex-shrink-0 p-2">
          <div class="flex items-center justify-center">
            <button
              type="button"
              class="w-full flex items-center justify-center gap-2 p-1.5 rounded-md text-micro uppercase tracking-wider font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.3)] hover:text-[hsl(var(--foreground))] transition-all group"
              :aria-label="isCollapsed ? 'Espandi sidebar' : 'Nascondi sidebar'"
              @click="toggleCollapsed"
            >
              <Icon 
                :name="isCollapsed ? 'heroicons:chevron-double-right' : 'heroicons:chevron-double-left'" 
                class="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" 
              />
              <span v-if="!isCollapsed" class="opacity-60 group-hover:opacity-100">Nascondi</span>
            </button>
          </div>
        </div>

        <!-- Resize Handle -->
        <div 
          v-if="!isCollapsed"
          class="absolute top-0 right-0 w-1 h-full cursor-col-resize group hover:bg-[hsl(var(--primary)/0.2)] transition-colors"
          @mousedown="startResize"
        >
          <div class="absolute top-1/2 right-0 -translate-y-1/2 w-1 h-8 bg-[hsl(var(--border))] rounded opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </aside>
</template>

<style scoped>
.sidebar-shell {
  /* Smooth transitions except during drag */
  transition: width 0.2s ease, min-width 0.2s ease, max-width 0.2s ease;
}

.sidebar-shell.dragging {
  transition: none;
}
</style>
