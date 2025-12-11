<script setup lang="ts">
import { computed } from 'vue'
import { useDashboardStats } from '@/composables/queries/useDashboardStats'
import { formatShortDate } from '@/lib/formatters'

definePageMeta({
  alias: ['/home'],
})

const { data, isLoading, isFetching, refetch } = useDashboardStats()

const stats = computed(() => data.value)

const statCards = computed(() => [
  { label: 'Commesse attive', value: stats.value?.active_projects ?? 0, caption: 'In gestione' },
  { label: 'Computi caricati', value: stats.value?.loaded_estimates ?? 0, caption: 'Totale importati' },
  { label: 'Ritorni di gara', value: stats.value?.offers ?? 0, caption: 'Offerte analizzate' },
  { label: 'Report generati', value: stats.value?.generated_reports ?? 0, caption: 'In sviluppo' },
])

const recentActivity = computed(() => stats.value?.recent_activity ?? [])

const shortDate = (value?: string | Date | null) => formatShortDate(value)
</script>

<template>
  <PageShell
    title="Dashboard"
    description="Sistema di gestione computi metrici e analisi gare"
    sticky-toolbar
  >
    <template #headerAside>
      <div class="flex items-center gap-2">
        <UButton color="primary" icon="i-lucide-folder-kanban" to="/projects">
          Apri commesse
        </UButton>
        <UButton color="gray" variant="soft" icon="i-lucide-list-checks" to="/price-catalog">
          Cataloghi
        </UButton>
      </div>
    </template>

    <template #toolbar>
      <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-xs text-muted-foreground">
          Layout ereditato dalla dashboard React: metriche, azioni rapide e attività recente.
        </p>
        <div class="flex items-center gap-2">
          <UBadge variant="soft" color="primary">Nuxt UI</UBadge>
          <UButton
            size="sm"
            color="gray"
            variant="ghost"
            icon="i-lucide-refresh-ccw"
            :loading="isFetching"
            @click="refetch"
          >
            Aggiorna
          </UButton>
        </div>
      </div>
    </template>

    <div v-if="isLoading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <UCard v-for="n in 4" :key="n" class="min-h-[150px] border-border/70 bg-card">
        <div class="space-y-3 p-4">
          <USkeleton class="h-3 w-24" />
          <USkeleton class="h-8 w-16" />
          <USkeleton class="h-3 w-28" />
        </div>
      </UCard>
    </div>

    <template v-else>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <UCard
          v-for="card in statCards"
          :key="card.label"
          class="border-border/70 bg-card shadow-sm"
        >
          <div class="space-y-1 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">{{ card.label }}</p>
            <p class="text-4xl font-semibold leading-none tracking-tight">{{ card.value }}</p>
            <p class="text-xs text-muted-foreground">{{ card.caption }}</p>
          </div>
        </UCard>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <UCard class="border-border/70 bg-card shadow-sm">
          <template #header>
            <div>
              <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Azioni rapide</p>
              <p class="text-sm font-semibold text-foreground">Operazioni più comuni</p>
            </div>
          </template>
          <div class="space-y-2">
            <UButton block color="primary" icon="i-lucide-folder-open" to="/projects">
              Visualizza commesse
            </UButton>
            <UButton block color="gray" variant="ghost" icon="i-lucide-settings" to="/settings">
              Impostazioni
            </UButton>
            <UButton block color="gray" variant="ghost" icon="i-lucide-upload" to="/projects/1/import">
              Import unificato (demo)
            </UButton>
          </div>
        </UCard>

        <UCard class="border-border/70 bg-card shadow-sm">
          <template #header>
            <div>
              <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Attività recente</p>
              <p class="text-sm font-semibold text-foreground">Ultime modifiche al sistema</p>
            </div>
          </template>
          <div v-if="!recentActivity.length" class="p-2 text-sm text-muted-foreground">
            Nessuna attività recente
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="item in recentActivity"
              :key="`${item.estimate_id}-${item.created_at}`"
              class="rounded-lg border border-border/60 bg-muted/40 px-3 py-2"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 space-y-1">
                  <p class="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
                    {{ item.type === 'project' ? 'Baseline' : 'Offerta' }}
                  </p>
                  <p class="truncate text-sm font-semibold text-foreground">
                    {{ item.estimate_name }}
                  </p>
                  <p class="truncate text-xs text-muted-foreground">
                    {{ item.project_code }} · {{ item.project_name }}
                  </p>
                </div>
                <UBadge color="gray" variant="soft" class="text-[11px]">
                  {{ shortDate(item.created_at) }}
                </UBadge>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </PageShell>
</template>
