<script setup lang="ts">
import PageShell from '@/components/layout/PageShell.vue'

definePageMeta({
  alias: ['/ricerca'],
})

const experiments = [
  { label: 'Charts test', description: 'Bozze di visualizzazioni dati', to: '/charts-lab' },
  { label: 'AgGrid playground', description: 'Interazioni con Tabelle avanzate', to: '/lab/charts-test' },
]
</script>

<template>
  <PageShell
    title="Lab"
    description="Area sperimentale per prototipi, demo interne e spike tecnici."
  >
    <div class="grid gap-4 lg:grid-cols-2">
      <UCard
        v-for="experiment in experiments"
        :key="experiment.label"
        class="border-border/70 bg-card shadow-sm"
      >
        <div class="space-y-2">
          <div>
            <p class="text-sm font-semibold text-foreground">{{ experiment.label }}</p>
            <p class="text-xs text-muted-foreground">{{ experiment.description }}</p>
          </div>
          <UButton
            color="primary"
            variant="soft"
            icon="i-lucide-flask-conical"
            size="sm"
            :to="experiment.to"
          >
            Apri
          </UButton>
        </div>
      </UCard>
    </div>
  </PageShell>
</template>
