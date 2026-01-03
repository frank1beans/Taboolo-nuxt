<script setup lang="ts">
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const toggleTheme = () => {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <header class="w-full h-full flex items-center justify-between px-4 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] z-40">
    <!-- Left / Center: Breadcrumb Area (Now Actions/Search Area) -->
    <div class="flex items-center min-w-0 flex-1 mr-4 gap-4">
      <slot name="start">
          <!-- Breadcrumb usually goes here -->
      </slot>
      <div id="topbar-actions-portal" class="flex-1 flex items-center min-w-0"/>
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-2 flex-shrink-0">
      <slot name="end">
          <!-- Search trigger TELEPORTED HERE -->

          <div class="h-4 w-px bg-[hsl(var(--border))] mx-1"/>

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
</template>
