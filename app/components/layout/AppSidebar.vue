<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { TreeNode } from '~/composables/useProjectTree'

const props = defineProps<{
  globalNodes?: TreeNode[] // New prop for global section
  contextNodes?: TreeNode[] // New prop for project context section
  nodes?: TreeNode[] // Kept for backward compat/transition (or just remove if ready)
  isCollapsed: boolean
  width: number
  minWidth: number
  maxWidth: number
  collapsedWidth: number
  activeNodeId?: string
  hasProject: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'resize', width: number): void
  (e: 'toggle'): void
}>()

const expandedState = ref<Record<string, boolean>>({})
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartWidth = ref(0)

const sanitizeTo = (to?: string) => {
  if (!to) return undefined
  if (to.includes('/null') || to.includes('/undefined')) return undefined
  return to
}

const visibleNodes = computed(() => {
  // Combine logic if we want to display all, or just process contextNodes for now if that's what we want "visible".
  // Actually, let's process both separately for rendering.
  return [] // unused if we split rendering
})

const processNodes = (nodes: TreeNode[]) => {
  const items: Array<{ node: TreeNode; depth: number }> = []
  const traverse = (nodes: TreeNode[], depth: number) => {
    nodes.forEach((node) => {
      items.push({ node: { ...node, to: sanitizeTo(node.to) }, depth })
      if (node.children?.length && expandedState.value[node.id] !== false) {
        traverse(node.children, depth + 1)
      }
    })
  }
  traverse(nodes, 0)
  return items
}

const visibleGlobalNodes = computed(() => processNodes(props.globalNodes || []))
const visibleContextNodes = computed(() => processNodes(props.contextNodes || (props.nodes || []))) // Fallback to 'nodes' if contextNodes missing

const toggleNode = (nodeId: string) => {
  expandedState.value[nodeId] = expandedState.value[nodeId] === false ? true : false
}

const isExpanded = (nodeId: string) => expandedState.value[nodeId] !== false

const ensurePathExpanded = (targetId?: string) => {
  if (!targetId) return
  const path: string[] = []
  const findPath = (nodes: TreeNode[], trail: string[]): boolean => {
    for (const node of nodes) {
      const nextTrail = [...trail, node.id]
      if (node.id === targetId) {
        path.push(...nextTrail)
        return true
      }
      if (node.children?.length && findPath(node.children, nextTrail)) return true
    }
    return false
  }

  if (findPath(props.globalNodes || [], []) || findPath(props.contextNodes || (props.nodes || []), [])) {
    path.forEach((id) => (expandedState.value[id] = true))
  }
}

watch(
  () => [props.nodes, props.activeNodeId],
  ([, id]) => ensurePathExpanded((id as string | undefined) ?? ''),
  { deep: true, immediate: true },
)

const startDragging = (event: MouseEvent) => {
  if (props.isCollapsed || !process.client) return
  isDragging.value = true
  dragStartX.value = event.clientX
  dragStartWidth.value = props.width

  document.addEventListener('mousemove', handleDragging)
  document.addEventListener('mouseup', stopDragging)
}

const handleDragging = (event: MouseEvent) => {
  if (!isDragging.value) return
  const delta = event.clientX - dragStartX.value
  const newWidth = Math.min(props.maxWidth, Math.max(props.minWidth, dragStartWidth.value + delta))
  emit('resize', newWidth)
}

const stopDragging = () => {
  if (!isDragging.value) return
  isDragging.value = false
  if (process.client) {
    document.removeEventListener('mousemove', handleDragging)
    document.removeEventListener('mouseup', stopDragging)
  }
}

onBeforeUnmount(stopDragging)

const showEmptyState = computed(() => !(props.nodes || []).length && !(props.contextNodes || []).length && props.hasProject && !props.loading)

const totalNodes = computed(() => {
  let count = 0
  const countRecursive = (nodes: TreeNode[]) => {
    count += nodes.length
    nodes.forEach(n => n.children && countRecursive(n.children))
  }
  if (props.nodes) countRecursive(props.nodes) 
  if (props.globalNodes) countRecursive(props.globalNodes)
  if (props.contextNodes) countRecursive(props.contextNodes)
  return count
})
</script>

<template>
  <aside
    class="app-sidebar relative flex h-screen flex-col overflow-hidden transition-[width] duration-200 ease-in-out"
    :style="{
      width: isCollapsed ? `${collapsedWidth}px` : `${width}px`,
      minWidth: `${isCollapsed ? collapsedWidth : minWidth}px`,
      maxWidth: `${maxWidth}px`,
    }"
  >
    <!-- Header / Branding -->
    <div 
      class="h-[76px] flex items-center flex-shrink-0 border-b border-[hsl(var(--sidebar-border))]"
      :class="isCollapsed ? 'justify-center px-2' : 'justify-start px-4 gap-3'"
    >
      <!-- Logo Icon -->
      <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] flex-shrink-0 shadow-sm">
        <UIcon name="i-heroicons-cube-transparent" class="w-5 h-5" />
      </div>

      <!-- App Name -->
      <div v-if="!isCollapsed" class="flex flex-col overflow-hidden transition-all duration-300">
        <span class="text-sm font-bold text-[hsl(var(--sidebar-foreground))] tracking-wide leading-none">
          TABOOLO
        </span>
        <span class="text-[10px] text-[hsl(var(--muted-foreground))] font-medium leading-none mt-1">
          Enterprise
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto py-2 px-3 scrollbar-thin">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-8">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 text-[hsl(var(--muted-foreground))] animate-spin" />
      </div>

      <div
        v-if="visibleGlobalNodes.length"
        :class="['mb-4 sidebar-section', isCollapsed ? 'px-1 py-2' : 'px-2 py-3']"
      >
         <div v-if="!isCollapsed" class="section-label">
           <span class="section-bullet" />
           <span class="section-title">Generale</span>
           <span class="section-line" />
        </div>
        <ul role="tree" aria-label="Navigazione Generale" class="space-y-0.5" :class="isCollapsed ? '' : 'pt-1'">
            <template v-for="item in visibleGlobalNodes" :key="item.node.id">
                <!-- Render Item Component (Reuse logic) -->
                <!-- We need to extract the item rendering logic to avoid duplication, OR just copy-paste for now since template extraction in Vue requires functional components or component extraction. For speed, I will duplicate the li content. -->
                <li role="treeitem" :aria-selected="item.node.id === activeNodeId">
                    <NuxtLink v-if="item.node.to" :to="item.node.to" :title="isCollapsed ? item.node.label : undefined" class="tree-row group relative flex items-center gap-2 rounded-lg cursor-pointer transition-all duration-150 outline-none" :class="[isCollapsed ? 'h-11 mx-1 justify-center' : 'h-10 px-2', item.node.id === activeNodeId ? 'bg-[hsl(var(--sidebar-primary)/0.15)] font-medium' : 'hover:bg-[hsl(var(--sidebar-accent))]', 'focus-visible:ring-2 focus-visible:ring-[hsl(var(--sidebar-ring))] focus-visible:ring-offset-1']" :style="isCollapsed ? {} : { paddingLeft: `${item.depth * 16 + 24}px` }">
                        <div v-if="item.node.id === activeNodeId" class="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[hsl(var(--sidebar-primary))] rounded-full" />
                        <Icon v-if="item.node.icon" :name="item.node.icon" :class="[isCollapsed ? 'w-5 h-5' : 'w-4 h-4', 'flex-shrink-0', item.node.id === activeNodeId ? 'text-[hsl(var(--sidebar-primary))]' : 'text-[hsl(var(--sidebar-foreground)/0.7)]']" />
                        <span
                          v-if="!isCollapsed"
                          class="flex-1 truncate text-sm"
                          :class="item.node.id === activeNodeId ? 'text-black dark:text-[hsl(var(--sidebar-primary-foreground))]' : 'text-[hsl(var(--sidebar-foreground))]'"
                        >
                          {{ item.node.label }}
                        </span>
                    </NuxtLink>
                </li>
            </template>
        </ul>
      </div>

      <!-- No Project (Moved here) -->
      <div v-if="!hasProject && !loading && !visibleContextNodes.length && !isCollapsed" class="text-center py-8 px-4 border-t border-[hsl(var(--sidebar-border))] mt-2 pt-6">
        <UIcon name="i-heroicons-folder-open" class="w-10 h-10 mx-auto mb-3 text-[hsl(var(--muted-foreground)/0.5)]" />
        <p class="text-sm text-[hsl(var(--muted-foreground))]">Nessun progetto selezionato</p>
        <UButton to="/projects" color="primary" variant="soft" size="xs" class="mt-3">
          Seleziona Progetto
        </UButton>
      </div>

      <div
        v-if="visibleContextNodes.length"
        :class="['sidebar-section', isCollapsed ? 'px-1 py-2' : 'px-2 py-3', visibleGlobalNodes.length ? 'mt-3' : '']"
      >
        <div v-if="!isCollapsed" class="section-label">
          <span class="section-bullet section-bullet--project" />
          <span class="section-title">Progetto</span>
          <span class="section-line" />
        </div>
        <ul role="tree" aria-label="Struttura progetto" class="space-y-0.5" :class="isCollapsed ? '' : 'pt-1'">
        <li
          v-for="item in visibleContextNodes"
          :key="item.node.id"
          role="treeitem"
          :aria-expanded="item.node.children?.length ? isExpanded(item.node.id) : undefined"
          :aria-selected="item.node.id === activeNodeId"
        >
          <!-- Link item (navigable) -->
          <NuxtLink
            v-if="item.node.to"
            :to="item.node.to"
            :title="isCollapsed ? item.node.label : undefined"
            class="tree-row group relative flex items-center gap-2 rounded-lg cursor-pointer transition-all duration-150 outline-none"
            :class="[
              isCollapsed ? 'h-11 mx-1 justify-center' : 'h-10 px-2',
              item.node.id === activeNodeId 
                ? 'bg-[hsl(var(--sidebar-primary)/0.15)] font-medium' 
                : 'hover:bg-[hsl(var(--sidebar-accent))]',
              'focus-visible:ring-2 focus-visible:ring-[hsl(var(--sidebar-ring))] focus-visible:ring-offset-1'
            ]"
            :style="isCollapsed ? {} : { paddingLeft: `${item.depth * 16 + 24}px` }"
          >
            <!-- Selected bar -->
            <div
              v-if="item.node.id === activeNodeId"
              class="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[hsl(var(--sidebar-primary))] rounded-full"
            />

            <!-- Chevron (only when expanded) -->
            <button
              v-if="item.node.children?.length && !isCollapsed"
              type="button"
              class="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-[hsl(var(--sidebar-accent))]"
              @click.stop.prevent="toggleNode(item.node.id)"
            >
              <UIcon
                name="i-heroicons-chevron-right-20-solid"
                class="w-4 h-4 text-[hsl(var(--muted-foreground))] transition-transform duration-150"
                :class="{ 'rotate-90': isExpanded(item.node.id) }"
              />
            </button>
            <div v-else-if="!isCollapsed" class="w-5 h-5 flex items-center justify-center">
              <div class="w-1 h-1 rounded-full bg-[hsl(var(--muted-foreground)/0.4)]" />
            </div>

            <!-- Icon -->
            <Icon
              v-if="item.node.icon"
              :name="item.node.icon"
              :class="[
                isCollapsed ? 'w-5 h-5' : 'w-4 h-4',
                'flex-shrink-0',
                item.node.id === activeNodeId ? 'text-[hsl(var(--sidebar-primary))]' : 'text-[hsl(var(--sidebar-foreground)/0.7)]'
              ]"
            />

            <!-- Label (only when expanded) -->
            <span
              v-if="!isCollapsed"
              class="flex-1 truncate text-sm"
              :class="item.node.id === activeNodeId ? 'text-black dark:text-[hsl(var(--sidebar-primary-foreground))]' : 'text-[hsl(var(--sidebar-foreground))]'"
            >
              {{ item.node.label }}
            </span>

            <!-- Count (only when expanded) -->
            <span
              v-if="item.node.count !== undefined && !isCollapsed"
              class="text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--muted-foreground))]"
            >
              {{ item.node.count }}
            </span>
          </NuxtLink>

          <!-- Non-link item (container) -->
          <div
            v-else
            :title="isCollapsed ? item.node.label : undefined"
            class="tree-row group relative flex items-center gap-2 rounded-lg cursor-pointer transition-all duration-150 outline-none"
            :class="[
              isCollapsed ? 'h-11 mx-1 justify-center' : 'h-10 px-2',
              item.node.id === activeNodeId 
                ? 'bg-[hsl(var(--sidebar-primary)/0.15)] font-medium' 
                : 'hover:bg-[hsl(var(--sidebar-accent))]',
              'focus-visible:ring-2 focus-visible:ring-[hsl(var(--sidebar-ring))] focus-visible:ring-offset-1'
            ]"
            :style="isCollapsed ? {} : { paddingLeft: `${item.depth * 16 + 24}px` }"
            @click="item.node.children?.length ? toggleNode(item.node.id) : undefined"
          >
            <!-- Selected bar -->
            <div
              v-if="item.node.id === activeNodeId"
              class="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[hsl(var(--sidebar-primary))] rounded-full"
            />

            <!-- Chevron (only when expanded) -->
            <button
              v-if="item.node.children?.length && !isCollapsed"
              type="button"
              class="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-[hsl(var(--sidebar-accent))]"
              @click.stop.prevent="toggleNode(item.node.id)"
            >
              <UIcon
                name="i-heroicons-chevron-right-20-solid"
                class="w-4 h-4 text-[hsl(var(--muted-foreground))] transition-transform duration-150"
                :class="{ 'rotate-90': isExpanded(item.node.id) }"
              />
            </button>
            <div v-else-if="!isCollapsed" class="w-5 h-5 flex items-center justify-center">
              <div class="w-1 h-1 rounded-full bg-[hsl(var(--muted-foreground)/0.4)]" />
            </div>

            <!-- Icon -->
            <Icon
              v-if="item.node.icon"
              :name="item.node.icon"
              :class="[
                isCollapsed ? 'w-5 h-5' : 'w-4 h-4',
                'flex-shrink-0',
                item.node.id === activeNodeId ? 'text-[hsl(var(--sidebar-primary))]' : 'text-[hsl(var(--sidebar-foreground)/0.7)]'
              ]"
            />

            <!-- Label (only when expanded) -->
            <span
              v-if="!isCollapsed"
              class="flex-1 truncate text-sm"
              :class="item.node.id === activeNodeId ? 'text-black dark:text-[hsl(var(--sidebar-primary-foreground))]' : 'text-[hsl(var(--sidebar-foreground))]'"
            >
              {{ item.node.label }}
            </span>

            <!-- Count (only when expanded) -->
            <span
              v-if="item.node.count !== undefined && !isCollapsed"
              class="text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--muted-foreground))]"
            >
              {{ item.node.count }}
            </span>
          </div>
        </li>
      </ul>
    </div>
  </div>

    <!-- Resize Handle -->
    <div
      v-if="!isCollapsed"
      class="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-[hsl(var(--sidebar-primary)/0.5)] transition-colors group"
      @mousedown.prevent="startDragging"
    >
      <div class="absolute top-1/2 right-0 -translate-y-1/2 w-1 h-8 bg-[hsl(var(--sidebar-border))] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  </aside>
</template>

<style scoped>
.app-sidebar {
  background-color: hsl(var(--sidebar-background));
  border-right: 1px solid hsl(var(--sidebar-border));
}

.tree-row {
  font-size: 0.875rem;
  line-height: 1.4;
}

.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--sidebar-border)) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: hsl(var(--sidebar-border));
  border-radius: var(--radius-sm);
}

.sidebar-section {
  border: 1px solid hsl(var(--sidebar-border));
  border-radius: var(--radius-xl);
  background: linear-gradient(
    180deg,
    hsl(var(--sidebar-background)) 0%,
    hsl(var(--sidebar-accent) / 0.6) 100%
  );
  box-shadow: inset 0 1px 0 hsl(var(--sidebar-border) / 0.5);
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 6px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 10px;
  font-weight: 700;
  color: hsl(var(--muted-foreground));
}

.section-title {
  padding: 2px 10px;
  border-radius: var(--radius-full);
  border: 1px solid hsl(var(--sidebar-border));
  background: hsl(var(--sidebar-accent));
  color: hsl(var(--sidebar-foreground));
}

.section-line {
  flex: 1;
  height: 1px;
  border-radius: var(--radius-full);
  background: hsl(var(--sidebar-border));
}

.section-bullet {
  width: 9px;
  height: 9px;
  border-radius: var(--radius-full);
  background: hsl(var(--sidebar-primary) / 0.9);
  box-shadow: 0 0 0 3px hsl(var(--sidebar-primary) / 0.15);
}

.section-bullet--project {
  background: hsl(var(--sidebar-primary));
  box-shadow: 0 0 0 3px hsl(var(--sidebar-primary) / 0.2);
}
</style>
