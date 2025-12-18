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
  <div class="flex gap-4 h-full">
    <!-- Main Content Area -->
    <div class="flex-1 min-w-0 flex flex-col h-full">
      <UCard 
        class="flex-1 border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col min-h-0"
        :ui="{ body: 'flex-1 min-h-0 flex flex-col p-0 sm:p-0' }"
      >
        
        <!-- Header Slot -->
        <template v-if="$slots.header" #header>
          <div class="p-4 sm:px-6">
            <slot name="header"></slot>
          </div>
        </template>

        <!-- Body Content -->
        <!-- We use flex-1 min-h-0 to allow children (like DataGrid) to take available space and scroll internally -->
        <div class="flex-1 min-h-0 relative flex flex-col p-4 sm:px-6">
            <div v-if="loading" class="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
            </div>
            <slot></slot>
        </div>

        <!-- Footer Slot -->
        <template v-if="$slots.footer" #footer>
          <slot name="footer"></slot>
        </template>
      </UCard>
    </div>

    <!-- Right Sidebar Slot (e.g. WBS) -->
    <div v-if="$slots.sidebar" class="flex-none">
      <slot name="sidebar"></slot>
    </div>
  </div>
</template>
