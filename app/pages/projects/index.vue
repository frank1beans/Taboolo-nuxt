<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatShortDate } from '~/lib/formatters'
import { STATUS_CONFIG } from '~/lib/constants'
import { useProjects, useImportProjectBundle, useExportProjectBundle } from '~/composables/queries/useProjectQueries'
import NewProjectDialog from '@/components/project/NewProjectDialog.vue'

definePageMeta({
  alias: ['/commesse'],
})

const router = useRouter()
const route = useRoute()

const search = ref('')
const bundleInput = ref<HTMLInputElement | null>(null)
const exportingId = ref<string | null>(null)
const showNewProjectDialog = ref(false)

const { data, isLoading, isFetching, refetch } = useProjects()
const importBundle = useImportProjectBundle()
const exportBundle = useExportProjectBundle()

const projects = computed(() => data.value ?? [])

const getQueryValue = (value?: string | string[] | null) =>
  Array.isArray(value) ? value[0] : value

const filterType = computed(() => getQueryValue(route.query.filter as string | string[] | undefined))
const filterValue = computed(() => getQueryValue(route.query.value as string | string[] | undefined))

const currentContext = computed<
  | { type: 'root' }
  | { type: 'businessUnit'; value: string }
  | { type: 'status'; value: string }
>(() => {
  if (filterType.value === 'businessUnit') {
    return { type: 'businessUnit', value: filterValue.value || 'Senza BU' }
  }
  if (filterType.value === 'status') {
    return { type: 'status', value: filterValue.value || 'setup' }
  }
  return { type: 'root' }
})

const contextLabel = computed(() => {
  if (currentContext.value.type === 'businessUnit') {
    return currentContext.value.value || 'Senza Business Unit'
  }
  if (currentContext.value.type === 'status') {
    const status = currentContext.value.value as keyof typeof STATUS_CONFIG
    return STATUS_CONFIG[status]?.label || 'Stato'
  }
  return 'Portfolio'
})

const businessUnitFolders = computed(() => {
  const map = new Map<string, { label: string; value: string; count: number }>()
  projects.value.forEach((project) => {
    const value = project.business_unit?.trim() || 'Senza BU'
    if (!map.has(value)) {
      map.set(value, { label: value, value, count: 0 })
    }
    map.get(value)!.count += 1
  })
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
})

const statusFolders = computed(() => {
  const statuses: Array<'setup' | 'in_progress' | 'closed'> = ['setup', 'in_progress', 'closed']
  return statuses.map((status) => ({
    status,
    label: STATUS_CONFIG[status].label,
    description: STATUS_CONFIG[status].description,
    count: projects.value.filter((p) => p.status === status).length,
  }))
})

const recentProjects = computed(() => {
  return [...projects.value]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)
})

const projectsForContext = computed(() => {
  if (currentContext.value.type === 'businessUnit') {
    const value = currentContext.value.value === 'Senza BU' ? null : currentContext.value.value
    return projects.value.filter((project) => (project.business_unit || null) === (value || null))
  }
  if (currentContext.value.type === 'status') {
    return projects.value.filter((project) => project.status === currentContext.value.value)
  }
  return []
})

const filteredProjects = computed(() => {
  if (!search.value.trim()) return projectsForContext.value
  const query = search.value.toLowerCase()
  return projectsForContext.value.filter((project) =>
    [project.name, project.code, project.description]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(query)),
  )
})

const goToContext = (type?: 'businessUnit' | 'status', value?: string) => {
  const query = type ? { filter: type, value: value ?? '' } : {}
  router.push({ path: '/projects', query })
  search.value = ''
}

const handleBundlePick = () => {
  bundleInput.value?.click()
}

const handleBundleChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    await importBundle.mutateAsync(file)
  } finally {
    target.value = ''
  }
}

const handleExport = async (projectId: string) => {
  exportingId.value = projectId
  try {
    await exportBundle.mutateAsync(projectId)
  } finally {
    exportingId.value = null
  }
}

const shortDate = (value?: string | Date | null) => formatShortDate(value)
</script>

<template>
  <PageShell
    title="Commesse"
    description="Gestione completa delle commesse con struttura ereditata dal frontend React."
    sticky-toolbar
  >
    <template #headerAside>
      <div class="flex flex-wrap items-center gap-2">
        <UButton color="primary" icon="i-lucide-plus" @click="showNewProjectDialog = true">
          Nuovo progetto
        </UButton>
        <UButton
          color="gray"
          variant="ghost"
          icon="i-lucide-refresh-ccw"
          :loading="isFetching"
          @click="refetch"
        >
          Aggiorna
        </UButton>
      </div>
    </template>

    <template #toolbar>
      <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-1">
          <p class="text-sm font-semibold text-foreground">{{ contextLabel }}</p>
          <p class="text-xs text-muted-foreground">
            {{ currentContext.type === 'root'
              ? 'Naviga per business unit o per stato come nella tree view di React.'
              : 'Ricerca all\'interno della cartella selezionata.' }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div v-if="currentContext.type !== 'root'" class="w-full sm:w-72">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Cerca per nome o codice..."
              size="md"
            />
          </div>
          <UButton
            color="gray"
            variant="soft"
            icon="i-lucide-upload-cloud"
            :loading="importBundle.isPending"
            @click="handleBundlePick"
          >
            Importa bundle (.mmcomm)
          </UButton>
          <input
            ref="bundleInput"
            type="file"
            accept=".mmcomm"
            class="hidden"
            @change="handleBundleChange"
          >
        </div>
      </div>
    </template>

    <div v-if="isLoading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <UCard v-for="n in 6" :key="n" class="border-border/70 bg-card shadow-sm">
        <div class="space-y-3 p-4">
          <USkeleton class="h-4 w-28" />
          <USkeleton class="h-3 w-20" />
          <USkeleton class="h-3 w-32" />
        </div>
      </UCard>
    </div>

    <template v-else>
      <div v-if="currentContext.type === 'root'" class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div class="space-y-4">
          <UCard class="border-border/70 bg-card shadow-sm">
            <template #header>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Business unit</p>
                  <p class="text-sm font-semibold text-foreground">Cartelle generate automaticamente</p>
                </div>
                <UBadge variant="soft" color="gray" class="text-[11px]">
                  {{ businessUnitFolders.length }} cartelle
                </UBadge>
              </div>
            </template>
            <div class="grid gap-3 sm:grid-cols-2">
              <UButton
                v-for="folder in businessUnitFolders"
                :key="folder.value"
                variant="ghost"
                color="gray"
                class="justify-between text-left"
                @click="goToContext('businessUnit', folder.value === 'Senza BU' ? '' : folder.value)"
              >
                <div class="space-y-1 text-left">
                  <p class="text-sm font-semibold text-foreground">{{ folder.label }}</p>
                  <p class="text-xs text-muted-foreground">{{ folder.count }} commesse</p>
                </div>
                <UIcon name="i-lucide-chevron-right" class="h-4 w-4 text-muted-foreground" />
              </UButton>
            </div>
          </UCard>

          <UCard class="border-border/70 bg-card shadow-sm">
            <template #header>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Stato commesse</p>
                  <p class="text-sm font-semibold text-foreground">Naviga per stato operativo</p>
                </div>
                <UBadge variant="soft" color="gray" class="text-[11px]">
                  {{ projects.length }} totali
                </UBadge>
              </div>
            </template>
            <div class="grid gap-3 sm:grid-cols-3">
              <UCard
                v-for="folder in statusFolders"
                :key="folder.status"
                class="border-border/60 bg-muted/40 shadow-none"
              >
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm font-semibold text-foreground">{{ folder.label }}</p>
                      <p class="text-xs text-muted-foreground">{{ folder.description }}</p>
                    </div>
                    <UBadge color="primary" variant="soft" class="font-mono text-[11px]">
                      {{ folder.count }}
                    </UBadge>
                  </div>
                  <UButton
                    color="primary"
                    variant="ghost"
                    size="sm"
                    class="w-full justify-between"
                    @click="goToContext('status', folder.status)"
                  >
                    Apri cartella
                    <UIcon name="i-lucide-arrow-up-right" class="h-4 w-4" />
                  </UButton>
                </div>
              </UCard>
            </div>
          </UCard>
        </div>

        <UCard class="border-border/70 bg-card shadow-sm">
          <template #header>
            <div>
              <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Commesse recenti</p>
              <p class="text-sm font-semibold text-foreground">Ultimi aggiornamenti</p>
            </div>
          </template>
          <div v-if="!recentProjects.length" class="text-sm text-muted-foreground">
            Nessun aggiornamento recente
          </div>
          <div v-else class="space-y-2">
            <button
              v-for="project in recentProjects"
              :key="project.id"
              type="button"
              class="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition hover:bg-muted/60"
              @click="router.push(`/projects/${project.id}/overview`)"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-foreground">{{ project.name }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ project.code }}</p>
              </div>
              <div class="flex flex-col items-end gap-1">
                <UBadge color="gray" variant="soft" class="text-[11px]">
                  {{ STATUS_CONFIG[project.status].label }}
                </UBadge>
                <span class="text-[11px] text-muted-foreground">
                  Agg. {{ shortDate(project.updated_at) }}
                </span>
              </div>
            </button>
          </div>
        </UCard>
      </div>

      <div v-else>
        <div class="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <UButton
            color="gray"
            variant="ghost"
            icon="i-lucide-arrow-left"
            size="sm"
            @click="goToContext()"
          >
            Torna al portfolio
          </UButton>
          <span class="text-[11px]">Progetti trovati: {{ filteredProjects.length }}</span>
        </div>
        <div v-if="filteredProjects.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <UCard
            v-for="project in filteredProjects"
            :key="project.id"
            class="border-border/70 bg-card shadow-sm"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-foreground">{{ project.name }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ project.code }}</p>
              </div>
              <UBadge variant="soft" color="primary" class="text-[11px]">
                {{ STATUS_CONFIG[project.status].label }}
              </UBadge>
            </div>
            <p class="mt-2 line-clamp-2 text-xs text-muted-foreground">
              {{ project.description || 'Nessuna descrizione' }}
            </p>
            <div class="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span>BU: {{ project.business_unit || '—' }}</span>
              <span>Agg. {{ shortDate(project.updated_at) }}</span>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <UButton
                color="primary"
                size="xs"
                :to="`/projects/${project.id}/overview`"
              >
                Overview
              </UButton>
              <UButton
                color="gray"
                variant="ghost"
                size="xs"
                :to="`/projects/${project.id}/estimate`"
              >
                Preventivi
              </UButton>
              <UButton
                color="gray"
                variant="ghost"
                size="xs"
                :to="`/projects/${project.id}/price-catalog`"
              >
                Listini
              </UButton>
              <UButton
                color="gray"
                variant="ghost"
                size="xs"
                :loading="exportingId === project.id && exportBundle.isPending"
                @click="handleExport(project.id)"
              >
                Export bundle
              </UButton>
            </div>
          </UCard>
        </div>
        <div v-else class="rounded-xl border border-dashed border-border p-8 text-center">
          <p class="mb-3 text-sm text-muted-foreground">
            Nessun progetto trovato. Crea il tuo primo progetto o importa un bundle .mmcomm.
          </p>
          <div class="flex justify-center gap-2">
            <UButton color="primary" icon="i-lucide-plus" @click="showNewProjectDialog = true">
              Nuovo progetto
            </UButton>
            <UButton
              color="gray"
              variant="soft"
              icon="i-lucide-upload-cloud"
              :loading="importBundle.isPending"
              @click="handleBundlePick"
            >
              Importa bundle
            </UButton>
          </div>
        </div>
      </div>
    </template>

    <!-- Single Modal Instance - Outside PageShell -->
    <Teleport to="body">
      <NewProjectDialog v-model:open="showNewProjectDialog" />
    </Teleport>
  </PageShell>
</template>
