<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppSidebar from '~/components/layout/AppSidebar.vue'
import AppHeader from '~/components/layout/AppHeader.vue'
import { useSidebarLayout } from '~/composables/useSidebarLayout'
import { useCurrentContext } from '~/composables/useCurrentContext'
import { useNavigation } from '~/composables/useNavigation'

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
const { globalNodes, contextNodes } = useNavigation(currentProject, currentEstimate)

onMounted(() => {
  hydrateFromApi()
})

const activeNodeId = computed(() => {
  const currentPath = route.path
  const currentQuery = route.query

  // Helper to parse query params from a URL string
  const getQueryParams = (urlString: string) => {
    try {
      // Add dummy base to parse relative URLs
      const url = new URL(urlString, 'http://dummy') 
      return Object.fromEntries(url.searchParams.entries())
    } catch {
      return {}
    }
  }

  // Find all potential matches
  const candidates: { id: string; score: number }[] = []

  const traverse = (nodes: Array<{ id: string; to?: string; children?: unknown[] }>) => {
    for (const node of nodes) {
      if (node.to) {
        // Split path and query
        const [nodePathString] = node.to.split('?')
        
        // 1. Check Path Match
        if (nodePathString === currentPath) {
          const nodeParams = getQueryParams(node.to)
          let isMatch = true
          let score = 0

          // 2. Check Query Match (All node params must exist and match in route)
          for (const [key, value] of Object.entries(nodeParams)) {
            // Compare as strings to be safe against number/string diffs in query
            if (String(currentQuery[key]) !== String(value)) {
              isMatch = false
              break
            }
            score++
          }

          if (isMatch) {
            candidates.push({ id: node.id, score })
          }
        }
      }

      if (node.children?.length) {
        traverse(node.children)
      }
    }
  }

  traverse([...globalNodes.value, ...contextNodes.value])

  // Sort by score (specificity) descending, then by order found (optional tie-breaker)
  candidates.sort((a, b) => b.score - a.score)

  if (candidates.length > 0) {
    return candidates[0].id
  }

  // Fallback logic
  if (route.path.includes('/projects') && currentProject.value && !currentEstimate.value) {
     return `project-${currentProject.value.id}`
  }

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

  if (currentEstimate.value && currentEstimate.value.id) {
    items.push({
      label: currentEstimate.value.name,
      to: `/projects/${currentProject.value?.id ?? ''}/estimate/${currentEstimate.value.id}`,
    })
  }

  const section =
    (route.meta?.breadcrumb as string | undefined) ||
    (route.meta?.section as string | undefined) ||
    (route.name && route.name !== 'index' ? formatRouteLabel(route.name.toString()) : undefined)

  if (section && items[items.length - 1]?.label !== section) {
    items.push({ label: section, to: '' })
  }

  return items
})
</script>

<template>
  <div class="layout-root">
    <UApp>
      <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-[hsl(var(--primary-foreground))] shadow-lg">
        Vai al contenuto principale
      </a>
      <div class="flex min-h-screen bg-background text-foreground">
        <AppSidebar
          :global-nodes="globalNodes"
          :context-nodes="contextNodes"
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
          <main id="main-content" class="flex-1 overflow-hidden relative" tabindex="-1">
            <div class="w-full h-full p-6 flex flex-col overflow-hidden">
              <slot />
            </div>
          </main>
        </div>
      </div>
    </UApp>
  </div>
</template>
