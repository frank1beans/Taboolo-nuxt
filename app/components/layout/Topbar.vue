<script setup lang="ts">
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const toggleTheme = () => {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

// Help system
const { isOpen: helpOpen, content: helpContent, currentTitle: helpTitle, isLoading: helpLoading, error: helpError, open: openHelp, close: closeHelp } = useHelp()
</script>

<template>
  <header class="w-full h-full flex items-center justify-between px-[var(--workspace-gutter-x)] bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] z-40">
    <!-- Left / Center: Breadcrumb Area (Now Actions/Search Area) -->
    <div class="flex items-center min-w-0 flex-1 mr-4 gap-4 h-full">
      <slot name="start">
          <!-- Breadcrumb usually goes here -->
      </slot>
      <div id="topbar-actions-portal" class="flex-1 flex items-center justify-center min-w-0 h-full"/>
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-2 flex-shrink-0">
      <slot name="end">
          <!-- Search trigger TELEPORTED HERE -->

          <div class="h-4 w-px bg-[hsl(var(--border))] mx-1"/>

          <!-- Help Button -->
          <HelpButton @click="openHelp" />

          <UButton
            :icon="isDark ? 'i-heroicons-sun-20-solid' : 'i-heroicons-moon-20-solid'"
            color="neutral"
            variant="ghost"
            aria-label="Theme Toggle"
            @click="toggleTheme"
          />
          
          <!-- User Menu -->
           <UAvatar
            src="" 
            alt="User"
            size="2xs"
            class="ring-2 ring-white dark:ring-gray-800 cursor-pointer" 
           />
      </slot>
    </div>
  </header>

  <!-- Help Modal -->
  <HelpModal
    :open="helpOpen"
    :content="helpContent"
    :title="helpTitle"
    :loading="helpLoading"
    :error="helpError"
    @close="closeHelp"
  />
</template>

<style scoped>
#topbar-actions-portal :deep(.page-toolbar) {
  align-items: center;
  height: 100%;
  padding-top: 0;
  padding-bottom: 0;
}
</style>

