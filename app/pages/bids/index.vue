<script setup lang="ts">
import PageShell from '@/components/layout/PageShell.vue'

definePageMeta({
  alias: ['/gare'],
})

const shortcuts = [
  { label: 'Nuova gara', icon: 'i-lucide-briefcase', to: '/projects' },
  { label: 'Importa analisi', icon: 'i-lucide-upload', to: '/import' },
  { label: 'Report offerte', icon: 'i-lucide-file-chart-column', to: '/docs' },
]
</script>

<template>
  <PageShell
    title="Gare"
    description="Placeholder temporaneo per la gestione delle gare e delle offerte."
    sticky-toolbar
  >
    <template #toolbar>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          v-for="shortcut in shortcuts"
          :key="shortcut.label"
          color="gray"
          variant="ghost"
          :icon="shortcut.icon"
          :to="shortcut.to"
          size="sm"
        >
          {{ shortcut.label }}
        </UButton>
      </div>
    </template>

    <div class="rounded-xl border border-dashed border-border/70 bg-muted/30 p-8 text-sm text-muted-foreground">
      <p class="font-medium text-foreground">Modulo gare in lavorazione</p>
      <p class="mt-2">
        Questo e' uno stub in attesa della migrazione completa delle viste React. Le rotte principali esistono,
        quindi la sidebar puo' navigare senza errori 404.
      </p>
    </div>
  </PageShell>
</template>
