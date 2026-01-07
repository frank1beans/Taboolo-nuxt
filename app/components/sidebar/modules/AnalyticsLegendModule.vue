<script setup lang="ts">
import { computed, unref, type Ref } from 'vue'
interface Project {
  id: string
  name?: string
  code?: string
}

interface Wbs6Category {
  code: string
  desc: string
  count: number
}

interface Cluster {
  id: number
  count: number
}

type MaybeRef<T> = T | Ref<T>

const props = defineProps<{
  colorBy: MaybeRef<'project' | 'cluster' | 'amount' | 'wbs06' | 'properties'>
  projects: MaybeRef<Project[]>
  wbs6Categories: MaybeRef<Wbs6Category[]>
  clusters: MaybeRef<Cluster[]>
  visibleProjects: MaybeRef<Set<string>>
  visibleWbs6: MaybeRef<Set<string>>
  visibleClusters: MaybeRef<Set<number>>
  getProjectColor: (id: string) => string
  getWbs06Color: (code: string) => string
  getClusterColor: (id: number) => string
  getProjectPointCount: (id: string) => number
}>()

const emit = defineEmits<{
  toggleVisibility: [type: 'project' | 'wbs06' | 'cluster', id: string | number]
  showAll: [type: 'project' | 'wbs06' | 'cluster']
  hideAll: [type: 'project' | 'wbs06' | 'cluster']
}>()

const resolvedColorBy = computed(() => unref(props.colorBy))
const resolvedProjects = computed(() => unref(props.projects) ?? [])
const resolvedWbs6 = computed(() => unref(props.wbs6Categories) ?? [])
const resolvedClusters = computed(() => unref(props.clusters) ?? [])
const resolvedVisibleProjects = computed(() => unref(props.visibleProjects) ?? new Set<string>())
const resolvedVisibleWbs6 = computed(() => unref(props.visibleWbs6) ?? new Set<string>())
const resolvedVisibleClusters = computed(() => unref(props.visibleClusters) ?? new Set<number>())
</script>

<template>
  <SidebarModule title="Legenda" subtitle="Colori" icon="heroicons:swatch">
    <div>
      <template v-if="resolvedColorBy === 'project'">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <h3 class="panel-section-header">Progetti</h3>
            <span class="value-badge">{{ resolvedProjects.length }}</span>
          </div>
          <div class="flex gap-1">
            <UButton size="2xs" color="neutral" variant="ghost" @click="emit('showAll', 'project')">Tutti</UButton>
            <UButton size="2xs" color="neutral" variant="ghost" @click="emit('hideAll', 'project')">Nessuno</UButton>
          </div>
        </div>
        <div class="space-y-1">
          <button
            v-for="project in resolvedProjects"
            :key="project.id"
            class="w-full px-2 py-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex justify-between items-center text-xs transition-colors hover:bg-[hsl(var(--muted)/0.4)]"
            :class="resolvedVisibleProjects.has(project.id) ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] opacity-50'"
            @click="emit('toggleVisibility', 'project', project.id)"
          >
            <span class="flex items-center gap-2 truncate">
              <UIcon
                :name="resolvedVisibleProjects.has(project.id) ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'"
                class="w-3.5 h-3.5 flex-shrink-0"
              />
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: getProjectColor(project.id) }"/>
              <span class="truncate">{{ project.name || project.code }}</span>
            </span>
            <span class="text-[10px] opacity-60">{{ getProjectPointCount(project.id) }}</span>
          </button>
        </div>
      </template>

      <template v-else-if="resolvedColorBy === 'wbs06'">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <h3 class="panel-section-header">Categorie WBS6</h3>
            <span class="value-badge">{{ resolvedWbs6.length }}</span>
          </div>
          <div class="flex gap-1">
            <UButton size="2xs" color="neutral" variant="ghost" @click="emit('showAll', 'wbs06')">Tutti</UButton>
            <UButton size="2xs" color="neutral" variant="ghost" @click="emit('hideAll', 'wbs06')">Nessuno</UButton>
          </div>
        </div>
        <div class="space-y-1">
          <button
            v-for="wbs in resolvedWbs6"
            :key="wbs.code"
            class="w-full px-2 py-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex justify-between items-center text-xs transition-colors hover:bg-[hsl(var(--muted)/0.4)]"
            :class="resolvedVisibleWbs6.has(wbs.code) ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] opacity-50'"
            @click="emit('toggleVisibility', 'wbs06', wbs.code)"
          >
            <span class="flex items-center gap-2 truncate">
              <UIcon
                :name="resolvedVisibleWbs6.has(wbs.code) ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'"
                class="w-3.5 h-3.5 flex-shrink-0"
              />
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: getWbs06Color(wbs.code) }"/>
              <span class="truncate" :title="wbs.code">{{ wbs.desc }}</span>
            </span>
            <span class="text-[10px] opacity-60">{{ wbs.count }}</span>
          </button>
        </div>
      </template>

      <template v-else-if="resolvedColorBy === 'cluster'">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <h3 class="panel-section-header">Cluster</h3>
            <span class="value-badge">{{ resolvedClusters.length }}</span>
          </div>
          <div class="flex gap-1">
            <UButton size="2xs" color="neutral" variant="ghost" @click="emit('showAll', 'cluster')">Tutti</UButton>
            <UButton size="2xs" color="neutral" variant="ghost" @click="emit('hideAll', 'cluster')">Nessuno</UButton>
          </div>
        </div>
        <div class="space-y-1">
          <button
            v-for="cluster in resolvedClusters"
            :key="cluster.id"
            class="w-full px-2 py-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex justify-between items-center text-xs transition-colors hover:bg-[hsl(var(--muted)/0.4)]"
            :class="resolvedVisibleClusters.has(cluster.id) ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] opacity-50'"
            @click="emit('toggleVisibility', 'cluster', cluster.id)"
          >
            <span class="flex items-center gap-2 truncate">
              <UIcon
                :name="resolvedVisibleClusters.has(cluster.id) ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'"
                class="w-3.5 h-3.5 flex-shrink-0"
              />
              <span class="w-5 h-2.5 rounded flex-shrink-0" :style="{ backgroundColor: getClusterColor(cluster.id) }"/>
              <span class="truncate">Cluster {{ cluster.id === -1 ? 'N/A' : cluster.id }}</span>
            </span>
            <span class="text-[10px] opacity-60">{{ cluster.count }}</span>
          </button>
        </div>
      </template>

      <template v-else>
        <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] p-2.5 text-xs text-[hsl(var(--muted-foreground))]">
          <p class="mb-2">Colorazione per prezzo (scala continua)</p>
          <div class="h-3 rounded bg-gradient-to-r from-purple-900 via-green-500 to-yellow-400" />
          <div class="flex justify-between text-[10px] mt-1">
            <span>Min</span>
            <span>Max</span>
          </div>
        </div>
      </template>
    </div>
  </SidebarModule>
</template>
