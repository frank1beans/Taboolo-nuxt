<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import Sidebar from '~/components/layout/Sidebar.vue'
import Topbar from '~/components/layout/Topbar.vue'
import Breadcrumb from '~/components/layout/Breadcrumb.vue'
import AppShell from '~/components/layout/AppShell.vue'
import SidebarShell from '~/components/sidebar/SidebarShell.vue'
import AssetsModule from '~/components/sidebar/modules/AssetsModule.vue'

import { useSidebarLayout } from '~/composables/useSidebarLayout'
import { useSidebarModules } from '~/composables/useSidebarModules'
import { useCurrentContext } from '~/composables/useCurrentContext'
import { useNavigation } from '~/composables/useNavigation'
import { useAppSidebar } from '~/composables/useAppSidebar'

const { showDefaultSidebar } = useAppSidebar()
const { hasModules, registerModule, unregisterModule } = useSidebarModules()
const route = useRoute()
const {
  isCollapsed,
  width,
  toggleCollapsed,
  collapse,
} = useSidebarLayout()

// Compute if sidebar should be completely hidden (no modules, no default sidebar)
const sidebarHidden = computed(() => 
  !hasModules.value && !showDefaultSidebar.value
)

const { currentProject, currentEstimate, hydrateFromApi, loading: contextLoading } = useCurrentContext()
const { globalNodes, contextNodes } = useNavigation(currentProject, currentEstimate)

onMounted(() => {
  hydrateFromApi()
  if (showDefaultSidebar.value) {
    registerAssetsModule()
  }
})

watch([hasModules, showDefaultSidebar], ([modulesAvailable, showDefault]) => {
  if (!modulesAvailable && !showDefault) {
    collapse()
  }
})

watch(showDefaultSidebar, (showDefault) => {
  if (showDefault) {
    registerAssetsModule()
    return
  }
  unregisterModule(assetsModuleId)
})

onUnmounted(() => {
  unregisterModule(assetsModuleId)
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

  const traverse = (nodes: NavNode[]) => {
    for (const node of nodes) {
      if (node.to) {
        const [nodePathString] = node.to.split('?')
        if (nodePathString === currentPath) {
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
          if (isMatch) candidates.push({ id: node.id, score })
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

const hasProject = computed(() => Boolean(currentProject.value))

const assetsModuleId = 'assets'

const registerAssetsModule = () => {
  registerModule({
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
            :active-node-id="activeNodeId"
          />
        </template>

        <!-- NEW Header -->
        <template #header>
          <Topbar>
            <template #start>
              <!-- Collapse Toggle (Left of breadcrumb) -->
               <div 
                v-if="showDefaultSidebar || hasModules"
                class="mr-3 flex items-center justify-center cursor-pointer text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                title="Toggle Sidebar"
                @click="toggleCollapsed"
              >
                <UIcon 
                  name="i-heroicons-bars-3-bottom-left" 
                  class="w-5 h-5" 
                />
              </div>
            </template>
          </Topbar>
        </template>

        <!-- Left Sidebar (Context) -->
        <template #sidebar>
          <div id="app-sidebar-portal" class="h-full relative">
            <SidebarShell />
          </div>
        </template>

        <!-- Main Content -->
        <main id="main-content" class="flex-1 h-full overflow-y-auto overflow-x-hidden relative scroll-smooth" tabindex="-1">
          <slot />
        </main>

        <!-- Bottombar Left (empty) -->
        <template #bottombar-left>
           <div class="flex items-center gap-2 px-4 text-[10px] text-[hsl(var(--muted-foreground))]">
             <span class="flex items-center gap-1">
               <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
               Online
             </span>
           </div>
        </template>

        <!-- Bottombar Center - Breadcrumb -->
        <template #bottombar-center>
           <div class="whitespace-nowrap overflow-hidden text-ellipsis">
             <Breadcrumb class="!text-xs" />
           </div>
        </template>

        <template #bottombar-right>
           <div id="app-bottombar-right" class="flex items-center h-full px-4"/>
        </template>
      </AppShell>
    </UApp>
  </div>
</template>
