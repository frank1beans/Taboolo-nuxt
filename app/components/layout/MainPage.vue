<script setup lang="ts">
/**
 * MainPage.vue
 * 
 * Standardized wrapper for full-screen application pages.
 * Handles the flexbox layout to enforce full height and prevent double scrollbars.
 */

interface Props {
  loading?: boolean
  fluid?: boolean
  transparent?: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="flex h-full">
    <!-- Main Content Area -->
    <div class="flex-1 min-w-0 min-h-0 flex flex-col h-full">
      <!-- Content Bubble Wrapper -->
      <div 
        class="w-full h-full flex flex-col overflow-hidden transition-colors duration-200"
        :class="[
          transparent ? 'bg-transparent' : 'surface-card',
          fluid ? '' : '' 
        ]"
      >
        
        <!-- Header (Internal) -->
        <div v-if="$slots.header" class="flex-shrink-0 flex flex-col justify-center px-[var(--workspace-gutter-x)] py-2">
          <slot name="header"/>
        </div>
        <!-- Body Content -->
        <div class="flex-1 min-h-0 relative flex flex-col">
          <div v-if="loading" class="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm">
            <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
          </div>
          <!-- Content wrapper with consistent gutter -->
          <div 
            class="flex-1 min-h-0 flex flex-col overflow-y-auto scrollbar-thin"
            :class="fluid ? '' : 'px-[var(--workspace-gutter-x)] pt-2 pb-4'"
          >
            <slot/>
          </div>
        </div>

        <!-- Footer Slot -->
        <div v-if="$slots.footer" class="px-4 py-3 flex-shrink-0 border-t border-[hsl(var(--border))]" :class="transparent ? 'border-transparent' : ''">
          <slot name="footer"/>
        </div>
      </div>
    </div>

    <!-- Right Sidebar Slot (e.g. WBS) -->
    <div v-if="$slots.sidebar" class="flex-none h-full">
      <slot name="sidebar"/>
    </div>
  </div>
</template>
