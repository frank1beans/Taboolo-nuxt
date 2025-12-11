<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjects } from '@/composables/queries/useProjectQueries'
import { UBadge, UButton, UCard } from '#components'

const router = useRouter()
const route = useRoute()

const { data: projects } = useProjects()

const navItems = [
  { label: 'Dashboard', icon: 'i-lucide-home', to: '/' },
  { label: 'Progetti', icon: 'i-lucide-folder-kanban', to: '/projects' },
  { label: 'Elenco prezzi', icon: 'i-lucide-list-checks', to: '/price-catalog' },
  { label: 'Budget', icon: 'i-lucide-piggy-bank', to: '/budget' },
  { label: 'Lab', icon: 'i-lucide-flask-conical', to: '/charts-lab' },
  { label: 'Profilo', icon: 'i-lucide-user-round', to: '/profile' },
]

const projectList = computed(() => projects.value ?? [])

const statusFilters = computed(() => {
  const totals = {
    setup: 0,
    in_progress: 0,
    closed: 0,
  }
  projectList.value.forEach((project) => {
    if (project.status in totals) {
      totals[project.status as keyof typeof totals] += 1
    }
  })
  return [
    { key: 'setup', label: 'Setup', tone: 'blue', count: totals.setup },
    { key: 'in_progress', label: 'In progress', tone: 'green', count: totals.in_progress },
    { key: 'closed', label: 'Closed', tone: 'gray', count: totals.closed },
  ]
})

const businessUnits = computed(() => {
  const map = new Map<string, number>()
  projectList.value.forEach((project) => {
    const key = project.business_unit?.trim() || 'Senza BU'
    map.set(key, (map.get(key) ?? 0) + 1)
  })
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
})

const isActiveFilter = (type?: string, value?: string | null) => {
  if (!type) {
    return !route.query.filter
  }
  if (type === 'status') {
    return route.query.filter === 'status' && route.query.value === value
  }
  if (type === 'businessUnit') {
    return route.query.filter === 'businessUnit' && route.query.value === value
  }
  return false
}

const goToProjects = (filter?: { type: 'status' | 'businessUnit'; value?: string }) => {
  const query = filter
    ? { filter: filter.type, value: filter.value ?? '' }
    : {}
  router.push({ path: '/projects', query })
}
</script>

<template>
  <aside class="hidden h-screen w-72 border-r border-border/60 bg-sidebar-background/80 text-sidebar-foreground backdrop-blur lg:block">
    <div class="flex h-full flex-col gap-4 p-4">
      <div class="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2 shadow-sm">
        <div class="h-10 w-10 rounded-xl bg-primary/10 p-1.5">
          <img src="~/assets/logo.png" alt="Taboolo" class="h-full w-full object-contain">
        </div>
        <div class="leading-tight">
          <p class="text-sm font-semibold text-foreground">Taboolo</p>
          <p class="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Nuxt UI</p>
        </div>
      </div>

      <UCard class="border-border/70 bg-card shadow-sm">
        <div class="flex flex-col gap-1">
          <UButton
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            color="gray"
            variant="ghost"
            size="md"
            :icon="item.icon"
            class="justify-start"
            :class="route.path === item.to ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'"
          >
            {{ item.label }}
          </UButton>
        </div>
      </UCard>

      <UCard class="space-y-3 border-border/70 bg-card shadow-sm">
        <div class="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <span>Stato progetti</span>
          <span class="text-[10px]">{{ projectList.length }} totali</span>
        </div>
        <div class="space-y-1">
          <UButton
            v-for="status in statusFilters"
            :key="status.key"
            :color="status.tone"
            variant="ghost"
            size="md"
            class="w-full justify-between"
            :class="isActiveFilter('status', status.key) ? 'bg-primary/10 text-primary' : ''"
            @click="goToProjects({ type: 'status', value: status.key })"
          >
            <span class="text-sm">{{ status.label }}</span>
            <UBadge :color="status.tone" variant="solid" class="font-mono text-[11px]">
              {{ status.count }}
            </UBadge>
          </UButton>
        </div>
      </UCard>

      <UCard class="space-y-3 border-border/70 bg-card shadow-sm">
        <div class="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <span>Business unit</span>
          <span class="text-[10px]">Top</span>
        </div>
        <div class="space-y-1">
          <UButton
            v-for="unit in businessUnits"
            :key="unit.label"
            color="gray"
            variant="ghost"
            size="md"
            class="w-full justify-between"
            :class="isActiveFilter('businessUnit', unit.label) ? 'bg-primary/10 text-primary' : ''"
            @click="goToProjects({ type: 'businessUnit', value: unit.label === 'Senza BU' ? '' : unit.label })"
          >
            <span class="text-sm truncate">{{ unit.label }}</span>
            <UBadge variant="soft" color="gray" class="font-mono text-[11px]">
              {{ unit.count }}
            </UBadge>
          </UButton>
        </div>
        <UButton
          color="gray"
          variant="soft"
          size="sm"
          class="w-full justify-center"
          @click="goToProjects()"
        >
          Vai a commesse
        </UButton>
      </UCard>
    </div>
  </aside>
</template>
