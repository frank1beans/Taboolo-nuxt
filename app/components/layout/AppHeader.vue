<script setup lang="ts">
import { computed } from 'vue'
import { useSidebarLayout } from '~/composables/useSidebarLayout'

const colorMode = useColorMode()
const { isCollapsed, toggleCollapsed } = useSidebarLayout()

const themeIcon = computed(() =>
  colorMode.value === 'dark'
    ? 'heroicons:sun-20-solid'
    : 'heroicons:moon-20-solid'
)

const collapseIcon = computed(() =>
  isCollapsed.value
    ? 'heroicons:bars-3-20-solid'
    : 'heroicons:x-mark-20-solid'
)

const toggleTheme = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <!-- Sticky Topbar -->
  <header class="sticky top-0 z-40 w-full h-14 bg-[hsl(var(--background)/0.8)] backdrop-blur-md border-b border-[hsl(var(--border)/0.4)] flex items-center justify-end px-4 shrink-0 transition-colors">
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        :aria-label="colorMode.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="toggleTheme"
      >
        <Icon :name="themeIcon" class="h-5 w-5" />
      </button>
    </div>
  </header>
</template>
