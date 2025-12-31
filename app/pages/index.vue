<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { dashboardApi } from '~/lib/api/dashboard'
import type { ApiDashboardStats } from '~/types/api'
import KpiHeader from '~/components/ui/KpiHeader.vue'
import KpiCard from '~/components/ui/KpiCard.vue'
import { useAppSidebar } from '~/composables/useAppSidebar'
import { useCurrentContext } from '~/composables/useCurrentContext'

definePageMeta({
  title: 'Dashboard',
  disableDefaultSidebar: true,
})

const { setCurrentProject } = useCurrentContext()

const stats = ref<ApiDashboardStats | null>(null)
const loading = ref(true)

const loadStats = async () => {
    loading.value = true
    try {
        stats.value = await dashboardApi.getStats()
    } catch (e) {
        console.error("Failed to load dashboard stats", e)
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    // Ensure we are in global context
    await setCurrentProject(null)
    loadStats()
})


const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="p-6 space-y-8 h-full overflow-y-auto">
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
                variant="primary"
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
                <div v-else-if="stats?.recent_activity?.length" class="divide-y divide-[hsl(var(--border))]">
                    <div v-for="(activity, index) in stats.recent_activity" :key="index" class="py-3 flex items-start gap-3">
                        <div class="mt-1 p-1.5 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                             <Icon name="heroicons:clock" class="w-4 h-4" />
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-medium">
                                {{ activity.estimate_name }}
                            </p>
                            <p class="text-xs text-[hsl(var(--muted-foreground))]">
                                in <span class="font-medium text-[hsl(var(--foreground))]">{{ activity.project_name }}</span> ({{ activity.project_code }})
                            </p>
                        </div>
                        <div class="text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                            {{ formatDate(activity.created_at) }}
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
</template>
