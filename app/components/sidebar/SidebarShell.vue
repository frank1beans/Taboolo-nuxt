<script setup lang="ts">
/**
 * SidebarShell.vue
 * 
 * Main container for the modular sidebar system.
 * Implements a vertical accordion layout where headers and content are interleaved.
 * Only one module is active (expanded) at a time, taking up ensuring vertical space.
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
      class="sidebar-shell h-full flex flex-col bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] relative transition-all duration-200 border border-[hsl(var(--border))]"
      :class="{ dragging: isDragging }"
      :style="{ 
        width: '100%',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-sm)'
      }"
    >
      <div class="h-full flex flex-col overflow-hidden rounded-[var(--radius-xl)]">
        
        <!-- Toggle Button (Top) -->
        <div class="flex-shrink-0 p-2 border-b border-[hsl(var(--border))]">
          <button
            type="button"
            class="w-full flex items-center gap-2 p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.3)] hover:text-[hsl(var(--foreground))] transition-all group"
            :class="isCollapsed ? 'justify-center' : ''"
            :aria-label="isCollapsed ? 'Espandi sidebar' : 'Comprimi sidebar'"
            :title="isCollapsed ? 'Espandi sidebar' : 'Comprimi sidebar'"
            @click="toggleCollapsed"
          >
            <Icon 
              name="heroicons:bars-3-bottom-left" 
              class="w-5 h-5 flex-shrink-0" 
            />
            <span v-if="!isCollapsed" class="text-sm font-medium truncate">Menu</span>
          </button>
        </div>
        
        <!-- Spacer per distanziare i moduli dal toggle -->
        <div class="flex-shrink-0 h-2" />
        
        <!-- Inner area for modules (no global scroll) -->
        <div class="flex-1 flex flex-col overflow-hidden">
          <template v-for="module in modules" :key="module.id">
            
            <!-- Module Header -->
            <UTooltip 
              :text="module.label" 
              placement="right" 
              :disabled="!isCollapsed"
              :popper="{ offset: [0, 10] }"
            >
              <button
                type="button"
                class="group w-full flex items-center gap-2 py-2 px-3 text-sm font-medium transition-colors border-b border-[hsl(var(--border)/0.3)] hover:bg-[hsl(var(--muted)/0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--ring))]"
                :class="[
                   activeModuleId === module.id && !isCollapsed
                    ? 'bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--foreground))]' 
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
                   isCollapsed ? 'justify-center px-0' : ''
                ]"
                @click="setActiveModule(module.id)"
              >
                <!-- Icon -->
                <Icon 
                  :name="module.icon" 
                  class="flex-shrink-0 w-5 h-5"
                  :class="{ 'text-[hsl(var(--primary))]': activeModuleId === module.id }"
                />
                
                <!-- Label (Expanded only) -->
                <span v-if="!isCollapsed" class="truncate flex-1 text-left">
                  {{ module.label }}
                </span>

                <!-- Badge / Chev -->
                <div v-if="!isCollapsed" class="flex items-center gap-2">
                  <span 
                    v-if="module.badge"
                    class="flex items-center justify-center min-w-[18px] h-4 px-1 text-micro font-bold rounded-full bg-[hsl(var(--primary))] text-white"
                  >
                    {{ module.badge }}
                  </span>
                  <!-- Chevron indicator -->
                  <Icon 
                     :name="activeModuleId === module.id ? 'heroicons:chevron-down' : 'heroicons:chevron-right'" 
                     class="w-4 h-4 opacity-30 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              </button>
            </UTooltip>

            <!-- Module Content (Active & Expanded only) -->
            <!-- flex-1 and overflow-y-auto moved here for localized scroll -->
            <div
              v-if="activeModuleId === module.id && !isCollapsed"
              class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin"
              :style="{
                paddingTop: 'var(--workspace-header-offset)', 
                paddingLeft: 'var(--workspace-gutter-x)',
                paddingRight: 'var(--workspace-gutter-x)',
                paddingBottom: '2rem'
              }"
            >
              <component 
                :is="module.component"
                v-bind="activeModuleProps"
                :key="module.id"
              />
            </div>
          </template>

          <div v-if="isCollapsed || !activeModuleId" class="flex-1"></div>
        </div>

        <!-- Resize Handle (Relative to outer container) -->
        <div 
          v-if="!isCollapsed"
          class="absolute top-0 -right-1 w-2 h-full cursor-col-resize group z-30 flex justify-center"
          @mousedown="startResize"
        >
          <div 
            class="w-1 h-full bg-primary/0 group-hover:bg-primary/20 transition-colors duration-200"
            :class="{ '!bg-primary/40': isDragging }"
          />
          <div 
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-[hsl(var(--border))] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            :class="{ 'opacity-100 bg-primary/60': isDragging }"
          />
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
