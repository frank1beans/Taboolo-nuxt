<script setup lang="ts">
/**
 * MainPage.vue
 * 
 * Standardized wrapper for full-screen application pages.
 * Handles the flexbox layout to enforce full height and prevent double scrollbars.
 */

interface Props {
  loading?: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="flex h-full">
    <!-- Main Content Area -->
    <div class="flex-1 min-w-0 min-h-0 flex flex-col h-full">
      <!-- Header Slot - Notion style: clean, simple padding -->
      <!-- Header Slot - Notion style: clean, simple padding -->
      <div v-if="$slots.header" class="surface-card page-header-sticky px-[var(--workspace-gutter-x)] py-2 flex-shrink-0">
        <slot name="header"/>
      </div>

      <!-- Body Content -->
      <!-- Uses workspace-body-fill pattern: flex-1 min-h-0 for proper vertical fill -->
      <div class="surface-card flex-1 min-h-0 relative flex flex-col overflow-hidden !rounded-t-none !border-t-0">
        <div v-if="loading" class="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
        </div>
        <!-- Content wrapper with consistent gutter -->
        <div class="flex-1 min-h-0 flex flex-col px-[var(--workspace-gutter-x)] pt-2 pb-4">
          <slot/>
        </div>
      </div>

      <!-- Footer Slot -->
      <div v-if="$slots.footer" class="surface-card px-4 py-3 flex-shrink-0 !rounded-t-none !border-t-0">
        <slot name="footer"/>
      </div>
    </div>

    <!-- Right Sidebar Slot (e.g. WBS) -->
    <div v-if="$slots.sidebar" class="flex-none h-full">
      <slot name="sidebar"/>
    </div>
  </div>
</template>
