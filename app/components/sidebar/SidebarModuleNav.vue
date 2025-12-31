<script setup lang="ts">
/**
 * SidebarModuleNav.vue
 * 
 * Navigation component for switching between sidebar modules.
 * Shows as vertical icon strip (collapsed) or folder tabs (expanded).
 */
import type { SidebarModule } from '~/composables/useSidebarModules'

defineProps<{
  modules: SidebarModule[]
  activeModuleId: string | null
  collapsed?: boolean
}>()

const emit = defineEmits<{
  select: [moduleId: string]
}>()

const selectModule = (moduleId: string) => {
  emit('select', moduleId)
}
</script>

<template>
  <nav class="sidebar-module-tabs">
    <!-- Collapsed: vertical icon strip -->
    <div v-if="collapsed" class="flex flex-col gap-1 py-2 px-3.5">
      <UTooltip 
        v-for="mod in modules" 
        :key="mod.id" 
        :text="mod.label" 
        placement="right"
      >
        <button
          type="button"
          class="module-tab-icon"
          :class="{ 'module-tab-icon--active': activeModuleId === mod.id }"
          @click="selectModule(mod.id)"
        >
          <Icon :name="mod.icon" class="w-5 h-5" />
          <!-- Badge for collapsed -->
          <span 
            v-if="mod.badge"
            class="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-3.5 px-0.5 text-[8px] font-bold rounded-full bg-[hsl(var(--primary))] text-white"
          >
            {{ mod.badge }}
          </span>
        </button>
      </UTooltip>
    </div>
    
    <!-- Expanded: folder-style tabs -->
    <div v-else class="flex gap-0.5 px-3 pb-0 border-b border-[hsl(var(--border))]" :style="{ paddingTop: 'var(--workspace-header-offset)' }">
      <button
        v-for="mod in modules"
        :key="mod.id"
        type="button"
        class="module-folder-tab"
        :class="{ 'module-folder-tab--active': activeModuleId === mod.id }"
        @click="selectModule(mod.id)"
      >
        <Icon :name="mod.icon" class="w-4 h-4" />
        <span>{{ mod.label }}</span>
        <!-- Badge for expanded -->
        <span 
          v-if="mod.badge"
          class="ml-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold rounded-full bg-[hsl(var(--primary))] text-white"
        >
          {{ mod.badge }}
        </span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
/* Folder Tab Styling */
.module-folder-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 0.3);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  border: 1px solid transparent;
  border-bottom: none;
  transition: all 0.15s ease;
  position: relative;
  margin-bottom: -1px; /* Overlap with border */
}

.module-folder-tab:hover {
  background: hsl(var(--muted) / 0.5);
  color: hsl(var(--foreground));
}

.module-folder-tab--active {
  background: hsl(var(--card));
  color: hsl(var(--foreground));
  border-color: hsl(var(--border));
  border-bottom-color: hsl(var(--card));
  z-index: 1;
}

/* Icon-only tabs for collapsed state */
.module-tab-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-md);
  color: hsl(var(--muted-foreground));
  transition: all 0.15s ease;
}

.module-tab-icon:hover {
  background: hsl(var(--muted) / 0.5);
  color: hsl(var(--foreground));
}

.module-tab-icon--active {
  background: hsl(var(--primary) / 0.12);
  color: hsl(var(--primary));
}
</style>
