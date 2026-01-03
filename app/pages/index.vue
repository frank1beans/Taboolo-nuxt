<script setup lang="ts">
import { ref, computed } from 'vue'
import { queryApi } from '~/utils/queries'
import { QueryKeys } from '~/types/queries'
import KpiHeader from '~/components/ui/KpiHeader.vue'
import KpiCard from '~/components/ui/KpiCard.vue'
import MainPage from '~/components/layout/MainPage.vue'
import { useCurrentContext } from '~/composables/useCurrentContext'

definePageMeta({
  title: 'Dashboard',
  disableDefaultSidebar: true,
})

const { setCurrentProject } = useCurrentContext()

// Fetch projects for list
const { data: projectsData, status: projectsStatus } = await useAsyncData('dashboard-projects', () => 
  queryApi.fetch(QueryKeys.PROJECT_LIST, { sort: 'updated_at:desc' })
)

const projects = computed(() => projectsData.value?.items || [])
const totalProjects = computed(() => projectsData.value?.total || 0)
// Simple mock stats derived from listing (or we could make a dedicated stats query if heavy)
// For now, we count what we see or use totals
const stats = computed(() => ({
    active_projects: totalProjects.value,
    loaded_estimates: 0, // Placeholder needs dedicated query or aggregate
    offers: 0, // Placeholder
    generated_reports: 0 // Placeholder
}))

const loading = computed(() => projectsStatus.value === 'pending')

onMounted(async () => {
    await setCurrentProject(null)
})

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>

<template>
  <MainPage>
    <div class="space-y-6 h-full overflow-y-auto">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">Bentornato</h1>
        <p class="text-[hsl(var(--muted-foreground))]">Ecco una panoramica delle tue attività recenti e dello stato dei progetti.</p>
      </div>
    </div>

    <!-- KPI Section -->
    <div v-if="stats">
        <KpiHeader :columns="4">
            <KpiCard
                :value="stats.active_projects"
                label="Progetti Attivi"
                icon="heroicons:folder-open"
                variant="info"
            />
            <KpiCard
                :value="stats.loaded_estimates"
                label="Computi Caricati"
                icon="heroicons:document-text"
                variant="info"
            />
            <KpiCard
                :value="stats.offers"
                label="Offerte Gestite"
                icon="heroicons:banknotes"
                variant="success"
            />
            <KpiCard
                :value="stats.generated_reports"
                label="Report Generati"
                icon="heroicons:presentation-chart-bar"
                variant="default"
            />
        </KpiHeader>
    </div>

    <div v-else-if="loading" class="grid grid-cols-4 gap-4">
        <!-- Skeleton Loading -->
        <div v-for="i in 4" :key="i" class="h-24 rounded-lg bg-[hsl(var(--muted))]/20 animate-pulse"/>
    </div>

    <!-- Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column: Activity Feed -->
        <div class="lg:col-span-2 space-y-6">
            <UCard>
                <template #header>
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold">Attività Recente</h3>
                        <UButton variant="ghost" size="sm" color="primary" to="/projects">Vedi tutti i progetti</UButton>
                    </div>
                </template>

                <div v-if="loading" class="space-y-4">
                     <div v-for="i in 3" :key="i" class="h-12 bg-[hsl(var(--muted))]/20 rounded animate-pulse"/>
                </div>
                <div v-else-if="projects.length" class="divide-y divide-[hsl(var(--border))]">
                    <div v-for="project in projects" :key="project.id" class="py-3 flex items-start gap-3">
                        <div class="mt-1 p-1.5 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                             <Icon name="heroicons:folder" class="w-4 h-4" />
                        </div>
                        <div class="flex-1">
                            <NuxtLink :to="`/projects/${project.id}`" class="text-sm font-medium hover:underline">
                                {{ project.name }}
                            </NuxtLink>
                            <p class="text-xs text-[hsl(var(--muted-foreground))]">
                                {{ project.code }} • {{ project.status }}
                            </p>
                        </div>
                        <div class="text-right">
                             <span class="text-xs font-medium text-[hsl(var(--foreground))]">
                                {{ project.estimates_count }} computi
                             </span>
                             <p class="text-[10px] text-[hsl(var(--muted-foreground))]">
                                Aggiornato {{ formatDate(project.updated_at) }}
                             </p>
                        </div>
                    </div>
                </div>
                <div v-else class="text-sm text-[hsl(var(--muted-foreground))] py-4 text-center">
                    Nessuna attività recente.
                </div>
            </UCard>
        </div>

        <!-- Right Column: Quick Actions or Secondary Stats -->
        <div class="space-y-6">
             <UCard>
                <template #header>
                    <h3 class="text-lg font-semibold">Risorse Utili</h3>
                </template>
                <div class="space-y-2">
                    <UButton to="/projects" block variant="soft" color="neutral" icon="i-heroicons-folder">
                        Tutti i Progetti
                    </UButton>
                    <UButton to="/catalogs" block variant="soft" color="neutral" icon="i-heroicons-book-open">
                        Listino Globale
                    </UButton>
                     <UButton block variant="soft" color="neutral" icon="i-heroicons-chart-bar">
                        Analytics (Beta)
                    </UButton>
                </div>
             </UCard>
        </div>
    </div>
    </div>
  </MainPage>
</template>
