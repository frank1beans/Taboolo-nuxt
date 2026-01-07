<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Sidebar from '~/components/layout/Sidebar.vue'
import Topbar from '~/components/layout/Topbar.vue'

import AppShell from '~/components/layout/AppShell.vue'
import SidebarShell from '~/components/sidebar/SidebarShell.vue'
import AssetsModule from '~/components/sidebar/modules/AssetsModule.vue'
import CommandPalette from '~/components/command-palette/CommandPalette.vue'

import { useSidebarLayout } from '~/composables/useSidebarLayout'
import { useSidebarModules } from '~/composables/useSidebarModules'
import { useCurrentContext } from '~/composables/useCurrentContext'
import { useNavigation } from '~/composables/useNavigation'
import { useProjectTree } from '~/composables/useProjectTree'
import { useCommandPaletteStore } from '~/stores/commandPalette'

const { hasModules, registerLayoutModule, unregisterModule, setActiveModule, activeModuleId } = useSidebarModules()
const route = useRoute()
const {
  isCollapsed,
  width,
  toggleCollapsed,
  collapse,
  showDefaultSidebar
} = useSidebarLayout()

// Compute if sidebar should be completely hidden (no modules, no default sidebar)
const sidebarHidden = computed(() => 
  !hasModules.value && !showDefaultSidebar.value
)

const { currentProject, currentEstimate, hydrateFromApi, loading: contextLoading } = useCurrentContext()
const { globalNodes } = useNavigation(currentProject, currentEstimate)
const commandPaletteStore = useCommandPaletteStore()
const { isOpen: isPaletteOpen } = storeToRefs(commandPaletteStore)

// Use useProjectTree for detailed tree structure
const { treeNodes: contextNodes } = useProjectTree(currentProject, currentEstimate)

// Determine if we're in a project route - Assets should ALWAYS be registered for project routes
const isProjectRoute = computed(() => route.path.includes('/projects/'))
const isProjectsSection = computed(() => route.path === '/projects' || route.path.startsWith('/projects/'))

// Register Assets for project routes immediately and persistently
const registerAssetsForProjects = () => {
  if (isProjectRoute.value) {
    registerAssetsModule()
  }
}

onMounted(() => {
  hydrateFromApi()
  registerAssetsForProjects()
  if (import.meta.client) {
    window.addEventListener('keydown', onCommandPaletteShortcut)
  }
})

// Keep Assets registered whenever we're in a project route
watch([isProjectRoute, currentProject], async ([isProject, project]) => {
  if (isProject && project) {
    registerAssetsModule()
    // Default to Assets only when nothing else is active
    await nextTick()
    if (!activeModuleId.value || activeModuleId.value === assetsModuleId) {
      setActiveModule(assetsModuleId)
    }
  } else if (!isProject) {
    unregisterModule(assetsModuleId)
  }
})

// Collapse sidebar only if no modules AND not in a project route
watch([hasModules, isProjectRoute], ([modulesAvailable, isProject]) => {
  if (!modulesAvailable && !isProject) {
    collapse()
  }
})

onUnmounted(() => {
  unregisterModule(assetsModuleId)
  if (import.meta.client) {
    window.removeEventListener('keydown', onCommandPaletteShortcut)
  }
})

// Active node logic can be simplified or extracted, but kept here for now as it couples with route
// Helper to parse query params from a URL string
const getQueryParams = (urlString: string) => {
  try {
    const url = new URL(urlString, 'http://dummy') // Dummy base
    return Object.fromEntries(url.searchParams.entries())
  } catch {
    return {}
  }
}

type NavNode = {
  id: string
  to?: string
  children?: NavNode[]
}

const activeNodeId = computed(() => {
  const currentPath = route.path
  const currentQuery = route.query
  const candidates: { id: string; score: number }[] = []

  const normalizePath = (p: string) => p.replace(/\/+$/, '')

  const traverse = (nodes: NavNode[]) => {
    for (const node of nodes) {
      if (node.to) {
        const nodePathString = node.to.split('?')[0] || ''
        
        // Validate exact path match (ignoring trailing slash)
        if (normalizePath(nodePathString) === normalizePath(currentPath)) {
          console.log('[Sidebar] Checking candidate:', node.id, 'Path:', nodePathString)
          const nodeParams = getQueryParams(node.to)
          let isMatch = true
          let score = 0
          for (const [key, value] of Object.entries(nodeParams)) {
            if (String(currentQuery[key]) !== String(value)) {
              isMatch = false
              break
            }
            score++
          }
          if (isMatch) {
             console.log('[Sidebar] Match confirmed:', node.id, 'Score:', score)
             candidates.push({ id: node.id, score })
          }
        }
      }
      if (node.children?.length) traverse(node.children)
    }
  }

  traverse([...globalNodes.value, ...contextNodes.value])
  candidates.sort((a, b) => b.score - a.score)

  if (candidates.length > 0) return candidates[0]?.id
  
  if (route.path.includes('/projects') && currentProject.value && !currentEstimate.value) {
     return `project-${currentProject.value.id}`
  }
  return ''
})

const activeGlobalNodeId = computed(() => isProjectsSection.value ? 'projects' : activeNodeId.value)

const hasProject = computed(() => Boolean(currentProject.value))

const assetsModuleId = 'assets'

const registerAssetsModule = () => {
  registerLayoutModule({
    id: assetsModuleId,
    label: 'Assets',
    icon: 'heroicons:folder-open',
    order: 0,
    component: AssetsModule,
    props: {
      nodes: contextNodes,
      activeNodeId,
      hasProject,
      loading: contextLoading,
    },
  })
}

function onCommandPaletteShortcut(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  if (key !== 'k') return
  if (!event.ctrlKey && !event.metaKey) return
  if (event.altKey) return

  event.preventDefault()
  if (isPaletteOpen.value) {
    commandPaletteStore.closePalette({ clearQuery: false })
    return
  }
  commandPaletteStore.openPalette()
}
</script>

<template>
  <div class="layout-root">
    <UApp>
       <!-- Accessibility skip link -->
      <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-[hsl(var(--primary-foreground))] shadow-lg">
        Vai al contenuto principale
      </a>

      <AppShell
        :sidebar-width="width"
        :sidebar-collapsed="isCollapsed"
        :sidebar-hidden="sidebarHidden"
        @update:sidebar-collapsed="toggleCollapsed"
      >
        <!-- NEW Sidebar -->
        <template #rail>
          <Sidebar 
            :nodes="globalNodes" 
            :active-node-id="activeGlobalNodeId"
          />
        </template>

        <!-- NEW Header -->
        <template #header>
          <Topbar />
        </template>

        <!-- Left Sidebar (Context) -->
        <template #sidebar>
          <div id="app-sidebar-portal" class="h-full relative py-2 pl-2 pr-2">
            <SidebarShell />
          </div>
        </template>

        <!-- Main Content -->
        <main id="main-content" class="flex-1 h-full overflow-hidden relative py-2 pr-2 pl-1" tabindex="-1">
          <slot />
        </main>

        <!-- Bottombar Left (empty) -->
        <template #bottombar-left>
           <div class="flex items-center gap-2 px-4 text-micro text-[hsl(var(--muted-foreground))]">
             <span class="flex items-center gap-1">
               <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
               Online
             </span>
           </div>
        </template>



        <template #bottombar-right>
           <div id="app-bottombar-right" class="flex items-center h-full px-4"/>
        </template>
      </AppShell>

      <CommandPalette />
      


    </UApp>
  </div>
</template>
