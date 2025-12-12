<script setup lang="ts">
import ColorModeToggle from '~/components/ColorModeToggle.vue'
import { useUiStore } from '~/stores/ui'

const uiStore = useUiStore()
</script>

<template>
  <header class="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
    <div class="flex items-center gap-4">
      <UButton
        color="gray"
        variant="ghost"
        icon="i-heroicons-bars-3-20-solid"
        class="md:hidden"
        @click="uiStore.toggleSidebar"
        aria-label="Toggle menu"
      />
      
      <div>
        <p class="text-xs uppercase tracking-wide text-muted-foreground">Workspace</p>
        <p class="text-sm font-semibold text-foreground">Taboolo Operations</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <ColorModeToggle />
      <UButton variant="soft" color="primary" size="sm">
        Nuova commessa
      </UButton>
    </div>
  </header>
</template>
