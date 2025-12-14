<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppSidebar from '~/components/layout/AppSidebar.vue'
import AppHeader from '~/components/layout/AppHeader.vue'
import { useSidebarLayout } from '~/composables/useSidebarLayout'
import { useCurrentContext } from '~/composables/useCurrentContext'
import { useProjectTree } from '~/composables/useProjectTree'

const route = useRoute()
const {
  isCollapsed,
  width,
  minWidth,
  maxWidth,
  collapsedWidth,
  toggleCollapsed,
  setWidth,
} = useSidebarLayout()

const { currentProject, currentEstimate, hydrateFromApi, loading: contextLoading } = useCurrentContext()
const { treeNodes } = useProjectTree(currentProject, currentEstimate)

onMounted(() => {
  hydrateFromApi()
})

const activeNodeId = computed(() => {
  if (currentEstimate.value) return `estimate-${currentEstimate.value.id}`
  if (currentProject.value) return `project-${currentProject.value.id}`
  return ''
})

const formatRouteLabel = (value?: string) => {
  if (!value) return undefined
  return value
    .split(/[/-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const crumbs = computed(() => {
  const items = [
    { label: 'Home', to: '/' },
    { label: 'Progetti', to: '/projects' },
  ]

  if (currentProject.value) {
    items.push({ label: currentProject.value.name, to: `/projects/${currentProject.value.id}` })
  }

  if (currentEstimate.value) {
    items.push({ label: currentEstimate.value.name, to: `/estimates/${currentEstimate.value.id}` })
  }

  const section =
    (route.meta?.breadcrumb as string | undefined) ||
    (route.meta?.section as string | undefined) ||
    (route.name && route.name !== 'index' ? formatRouteLabel(route.name.toString()) : undefined)

  if (section && items[items.length - 1]?.label !== section) {
    items.push({ label: section })
  }

  return items
})
</script>

<template>
  <UApp>
    <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground shadow-lg">
      Vai al contenuto principale
    </a>
    <div class="flex min-h-screen bg-background text-foreground">
      <AppSidebar
        :nodes="treeNodes"
        :is-collapsed="isCollapsed"
        :width="width"
        :min-width="minWidth"
        :max-width="maxWidth"
        :collapsed-width="collapsedWidth"
        :active-node-id="activeNodeId"
        :has-project="Boolean(currentProject)"
        :loading="contextLoading"
        @toggle="toggleCollapsed"
        @resize="setWidth"
      />
      <div class="flex flex-1 flex-col">
        <AppHeader :crumbs="crumbs" />
        <main id="main-content" class="flex-1 overflow-y-auto" tabindex="-1">
          <div class="w-full p-6">
            <slot />
          </div>
        </main>
      </div>
    </div>
  </UApp>
</template>
