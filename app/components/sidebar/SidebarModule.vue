<script setup lang="ts">
/**
 * SidebarModule.vue
 * 
 * Base wrapper component for sidebar modules.
 * Provides consistent structure: header, body, footer.
 */

withDefaults(defineProps<{
  /** Module title displayed in header */
  title: string
  /** Optional subtitle */
  subtitle?: string
  /** Icon for the header */
  icon?: string
  /** Show loading state */
  loading?: boolean
  /** Hide the module header (title and icon) */
  hideHeader?: boolean
}>(), {
  loading: false,
  hideHeader: false
})

defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="sidebar-module h-full flex flex-col">
    <!-- Header -->
    <div v-if="!hideHeader" class="sidebar-module-header h-11 flex items-center gap-2 px-3 border-b border-[hsl(var(--border))/0.5] flex-shrink-0 bg-[hsl(var(--card))]">
      <Icon v-if="icon" :name="icon" class="w-4 h-4 text-[hsl(var(--primary))]" />
      <div class="flex-1 min-w-0">
        <h3 class="text-xs font-semibold text-[hsl(var(--foreground))] truncate">
          {{ title }}
        </h3>
        <p v-if="subtitle" class="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
          {{ subtitle }}
        </p>
      </div>
      <slot name="header-actions" />
    </div>

    <!-- Scrollable Body -->
    <div 
      class="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-3 relative"
      :class="hideHeader ? 'pt-1 pb-4' : 'py-2'"
    >
      <!-- Loading overlay -->
      <div 
        v-if="loading" 
        class="absolute inset-0 bg-[hsl(var(--card))/0.8] flex items-center justify-center z-10"
      >
        <Icon name="heroicons:arrow-path" class="w-5 h-5 text-[hsl(var(--primary))] animate-spin" />
      </div>
      
      <!-- Content slot -->
      <div class="p-3">
        <slot />
      </div>
    </div>

    <!-- Footer (optional) -->
    <div v-if="$slots.footer" class="sidebar-module-footer border-t border-[hsl(var(--border))/0.5] p-3 flex-shrink-0">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.sidebar-module-body {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--border)) transparent;
}

.sidebar-module-body::-webkit-scrollbar {
  width: 4px;
}

.sidebar-module-body::-webkit-scrollbar-thumb {
  background-color: hsl(var(--border));
  border-radius: 4px;
}
</style>
