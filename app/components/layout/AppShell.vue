<script setup lang="ts">
import { computed } from 'vue'
import AppSidebar from '~/components/layout/AppSidebar.vue'
import AppHeader from '~/components/layout/AppHeader.vue'
import { useCurrentContext } from '~/composables/useCurrentContext'
import { useProjectTree } from '~/composables/useProjectTree'
import { useSidebarLayout } from '~/composables/useSidebarLayout'

interface Crumb {
  label: string
  to?: string
}

const props = defineProps<{
  crumbs?: Crumb[]
}>()

const { currentProject, currentEstimate } = useCurrentContext()
const { treeNodes } = useProjectTree(currentProject, currentEstimate)
const {
  isCollapsed,
  width,
  minWidth,
  maxWidth,
  collapsedWidth,
  toggleCollapsed,
  setWidth,
} = useSidebarLayout()

const defaultCrumbs = computed<Crumb[]>(() => {
  const items: Crumb[] = [
    { label: 'Home', to: '/' },
    { label: 'Progetti', to: '/projects' },
  ]

  if (currentProject.value) {
    items.push({ label: currentProject.value.name })
  }
  if (currentEstimate.value) {
    items.push({ label: currentEstimate.value.name })
  }
  return items
})

const crumbsToRender = computed(() => props.crumbs ?? defaultCrumbs.value)

const activeNodeId = computed(() => {
  if (currentEstimate.value) return `estimate-${currentEstimate.value.id}`
  if (currentProject.value) return `project-${currentProject.value.id}`
  return ''
})
</script>

<template>
  <div class="flex min-h-screen bg-gradient-to-br from-[hsl(var(--background))] via-[hsl(var(--secondary))] to-[hsl(var(--background))] text-[hsl(var(--foreground))]">
    <AppSidebar
      :nodes="treeNodes"
      :is-collapsed="isCollapsed"
      :width="width"
      :min-width="minWidth"
      :max-width="maxWidth"
      :collapsed-width="collapsedWidth"
      :active-node-id="activeNodeId"
      :has-project="Boolean(currentProject)"
      @toggle="toggleCollapsed"
      @resize="setWidth"
    />

    <div class="relative flex min-h-screen flex-1 flex-col overflow-hidden">
      <AppHeader :crumbs="crumbsToRender" />

      <main class="flex-1 overflow-y-auto px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <div class="h-full rounded-2xl border border-[hsl(var(--border)/0.4)] bg-[hsl(var(--card)/0.85)] p-6 shadow-[0_18px_56px_hsl(var(--foreground)/0.25)] backdrop-blur-lg">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
