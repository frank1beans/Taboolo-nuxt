<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import MainPage from '~/components/layout/MainPage.vue'
import { useCurrentContext } from '~/composables/useCurrentContext'
import { usePageSidebarModule } from '~/composables/useSidebarModules'
import HomeQuickActionsModule from '~/components/sidebar/modules/HomeQuickActionsModule.vue'
import HomeResourcesModule from '~/components/sidebar/modules/HomeResourcesModule.vue'
import HomeSystemStatusModule from '~/components/sidebar/modules/HomeSystemStatusModule.vue'

definePageMeta({
  title: 'Dashboard',
  disableDefaultSidebar: true,
})

const { setCurrentProject } = useCurrentContext()

// --- Data Types ---
type ProjectListRow = {
  id: string
  name: string
  code: string
  status?: string
  updated_at?: string
  estimates_count?: number
}

// Fetch projects
const { data: projectsData, status: projectsStatus } = await useAsyncData('dashboard-projects', () => 
  $fetch<{ data: ProjectListRow[]; total: number }>('/api/projects', {
    query: { page: 1, pageSize: 5, sort: 'updated_at', order: 'desc' },
  })
)

// Fetch Stats
const { data: statsData } = await useFetch('/api/dashboard/stats')

const projects = computed(() => projectsData.value?.data || [])
const totalProjects = computed(() => projectsData.value?.total || 0)

const loading = computed(() => projectsStatus.value === 'pending')

onMounted(async () => {
    await setCurrentProject(null)
})

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const currentHour = new Date().getHours()
const greeting = computed(() => {
    if (currentHour < 12) return 'Buongiorno'
    if (currentHour < 18) return 'Buon pomeriggio'
    return 'Buonasera'
})

// Quick Actions
const quickActions = [
    { label: 'Nuovo Progetto', icon: 'heroicons:plus', to: '/projects?create=1', color: 'bg-primary text-primary-foreground' },
    { label: 'Importa Dati', icon: 'heroicons:arrow-down-tray', to: '/import', color: 'bg-blue-500 text-white' },
    { label: 'Analisi Computi', icon: 'heroicons:chart-pie', to: '/analytics', color: 'bg-orange-500 text-white' },
]

const homeResources = [
    { label: 'Manuale Utente', icon: 'heroicons:book-open', href: '#' },
    { label: 'Video Tutorial', icon: 'heroicons:academic-cap', href: '#' },
    { label: 'Supporto Tecnico', icon: 'heroicons:lifebuoy', href: '#' },
]

const systemStatus = {
    label: 'Tutti i sistemi operativi',
    version: 'v2.4.0',
    online: true,
}

usePageSidebarModule({
    id: 'home-actions',
    label: 'Azioni',
    icon: 'heroicons:bolt',
    order: 0,
    component: HomeQuickActionsModule,
    props: {
        actions: quickActions,
    },
})

usePageSidebarModule({
    id: 'home-resources',
    label: 'Risorse',
    icon: 'heroicons:book-open',
    order: 1,
    component: HomeResourcesModule,
    props: {
        resources: homeResources,
        description: 'Documentazione e link rapidi per aiutarti nel lavoro.',
    },
})

usePageSidebarModule({
    id: 'home-status',
    label: 'Stato',
    icon: 'heroicons:signal',
    order: 2,
    component: HomeSystemStatusModule,
    props: {
        status: systemStatus,
    },
})

</script>

<template>
  <MainPage fluid transparent>
    <div class="space-y-8 pb-12">
        
        <!-- Hero Section -->
        <div class="relative bg-gradient-to-r from-[hsl(var(--sidebar-background))] to-[hsl(var(--card))] border-b border-[hsl(var(--border))] px-8 py-10 shadow-sm">
            <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div class="space-y-2">
                    <h1 class="text-4xl font-extrabold tracking-tight text-[hsl(var(--foreground))]">
                        {{ greeting }}, <span class="text-primary">Bentornato.</span>
                    </h1>
                    <p class="text-lg text-[hsl(var(--muted-foreground))] max-w-2xl">
                        Il tuo centro di controllo per progetti, stime e analisi.
                        Hai <strong class="text-foreground">{{ statsData?.active_projects || 0 }}</strong> progetti attivi.
                    </p>
                </div>
                <div class="flex items-center gap-3">
                     <span class="text-sm font-medium px-4 py-2 rounded-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
                        {{ new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
                     </span>
                </div>
            </div>
        </div>

        <div class="max-w-7xl mx-auto px-6 space-y-8">
            
            <!-- Stats Grid (Premium Cards) -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <!-- Statistic 1 -->
                <div class="group relative overflow-hidden rounded-2xl bg-card border border-border/50 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Icon name="heroicons:folder-open" class="w-16 h-16 text-primary" />
                    </div>
                    <div class="relative z-10">
                        <div class="flex items-center gap-3 mb-2">
                            <div class="p-2 rounded-lg bg-primary/10 text-primary">
                                 <Icon name="heroicons:folder" class="w-5 h-5" />
                            </div>
                            <span class="text-sm font-medium text-muted-foreground uppercase tracking-wider">Progetti Attivi</span>
                        </div>
                        <div class="text-3xl font-bold text-foreground">{{ statsData?.active_projects || 0 }}</div>
                    </div>
                </div>

                <!-- Statistic 2 -->
                 <div class="group relative overflow-hidden rounded-2xl bg-card border border-border/50 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Icon name="heroicons:document-text" class="w-16 h-16 text-blue-500" />
                    </div>
                    <div class="relative z-10">
                        <div class="flex items-center gap-3 mb-2">
                             <div class="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                                 <Icon name="heroicons:document-text" class="w-5 h-5" />
                            </div>
                            <span class="text-sm font-medium text-muted-foreground uppercase tracking-wider">Computi Totali</span>
                        </div>
                        <div class="text-3xl font-bold text-foreground">{{ statsData?.loaded_estimates || 0 }}</div>
                         <div class="mt-2 text-xs font-medium text-muted-foreground flex items-center gap-1">
                             <span>Aggiornato oggi</span>
                        </div>
                    </div>
                </div>

                <!-- Statistic 3 -->
                <div class="group relative overflow-hidden rounded-2xl bg-card border border-border/50 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Icon name="heroicons:banknotes" class="w-16 h-16 text-amber-500" />
                    </div>
                    <div class="relative z-10">
                        <div class="flex items-center gap-3 mb-2">
                             <div class="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                                 <Icon name="heroicons:banknotes" class="w-5 h-5" />
                            </div>
                            <span class="text-sm font-medium text-muted-foreground uppercase tracking-wider">Offerte Approvate</span>
                        </div>
                        <div class="text-3xl font-bold text-foreground">{{ statsData?.approved_offers || 0 }}</div>
                    </div>
                </div>

                <!-- Statistic 4 -->
                <div class="group relative overflow-hidden rounded-2xl bg-card border border-border/50 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
                     <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Icon name="heroicons:users" class="w-16 h-16 text-purple-500" />
                    </div>
                    <div class="relative z-10">
                        <div class="flex items-center gap-3 mb-2">
                            <div class="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                                 <Icon name="heroicons:users" class="w-5 h-5" />
                            </div>
                            <span class="text-sm font-medium text-muted-foreground uppercase tracking-wider">Utenti Attivi</span>
                        </div>
                        <div class="text-3xl font-bold text-foreground">{{ statsData?.active_users || 0 }}</div>
                    </div>
                </div>
            </div>

            <!-- Main Content Area: Charts & Activity -->
            <div class="space-y-6">
                <!-- Chart removed as per request -->

                <!-- Recent Projects List -->
                <div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                    <div class="p-6 border-b border-border flex items-center justify-between">
                        <h3 class="text-lg font-bold text-foreground">Progetti Recenti</h3>
                        <NuxtLink to="/projects" class="text-sm font-medium text-primary hover:underline">Vedi tutti &rarr;</NuxtLink>
                    </div>
                    <div class="divide-y divide-border">
                         <div v-for="project in projects" :key="project.id" class="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors group">
                            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <Icon name="heroicons:folder" class="w-5 h-5" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <NuxtLink :to="`/projects/${project.id}`" class="text-base font-semibold text-foreground hover:text-primary truncate block">
                                    {{ project.name }}
                                </NuxtLink>
                                <div class="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                    <span class="font-mono bg-muted px-1.5 py-0.5 rounded">{{ project.code }}</span>
                                    <span>&middot;</span>
                                    <span>Aggiornato {{ formatDate(project.updated_at || '') }}</span>
                                </div>
                            </div>
                             <div class="text-right flex flex-col items-end">
                                 <span class="text-sm font-medium">{{ project.estimates_count || 0 }} Computi</span>
                            </div>
                            <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Icon name="heroicons:chevron-right" class="w-5 h-5 text-muted-foreground" />
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </MainPage>
</template>

<style scoped>
/* Gradient Text for Welcome */
/* Not essential if using standard colors, but nice for Premium feel if desired. 
   Currently using standard text-primary. 
*/
</style>
