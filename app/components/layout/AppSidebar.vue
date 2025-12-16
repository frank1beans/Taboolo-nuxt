<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { TreeNode } from '~/composables/useProjectTree'

const props = defineProps<{
  nodes: TreeNode[]
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

const visibleNodes = computed(() => {
  const items: Array<{ node: TreeNode; depth: number }> = []
  const traverse = (nodes: TreeNode[], depth: number) => {
    nodes.forEach((node) => {
      items.push({ node, depth })
      if (node.children?.length && expandedState.value[node.id] !== false) {
        traverse(node.children, depth + 1)
      }
    })
  }
  traverse(props.nodes, 0)
  return items
})

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

  if (findPath(props.nodes, [])) {
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
  emit('resize', dragStartWidth.value + delta)
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

const showEmptyState = computed(() => !props.nodes.length && props.hasProject && !props.loading)

const totalNodes = computed(() => {
  let count = 0
  const countRecursive = (nodes: TreeNode[]) => {
    count += nodes.length
    nodes.forEach(n => n.children && countRecursive(n.children))
  }
  countRecursive(props.nodes)
  return count
})
</script>

<template>
  <aside
    class="relative flex h-screen flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
    :style="{
      width: `${width}px`,
      minWidth: `${isCollapsed ? collapsedWidth : minWidth}px`,
      maxWidth: `${maxWidth}px`,
    }"
  >
    <!-- Header -->
    <div class="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
      <div v-if="!isCollapsed" class="flex items-center gap-2">
        <UIcon name="i-heroicons-rectangle-group" class="w-4 h-4 text-primary-500" />
        <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">Struttura</span>
        <UBadge 
          v-if="totalNodes > 0" 
          color="neutral" 
          variant="soft" 
          size="xs"
          :aria-label="`${totalNodes} elementi`"
        >
          {{ totalNodes }}
        </UBadge>
      </div>
      <div v-else class="flex items-center justify-center w-full">
        <UIcon name="i-heroicons-rectangle-group" class="w-4 h-4 text-primary-500" />
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto py-2 px-1">
      <!-- No Project -->
      <div v-if="!hasProject && !loading && !isCollapsed" class="text-center py-8 px-4">
        <UIcon name="i-heroicons-folder-open" class="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p class="text-sm text-slate-500 dark:text-slate-400">Seleziona un progetto</p>
        <UButton to="/projects" color="primary" variant="soft" size="xs" class="mt-3">
          Vai a Progetti
        </UButton>
      </div>

      <!-- Empty -->
      <div v-else-if="showEmptyState && !isCollapsed" class="text-center py-8 px-4">
        <UIcon name="i-heroicons-document-text" class="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p class="text-sm text-slate-500 dark:text-slate-400">Nessun preventivo</p>
      </div>

      <!-- Tree -->
      <ul v-else role="tree" aria-label="Struttura progetto" class="space-y-0.5">
        <li
          v-for="item in visibleNodes"
          :key="item.node.id"
          role="treeitem"
          :aria-expanded="item.node.children?.length ? isExpanded(item.node.id) : undefined"
          :aria-selected="item.node.id === activeNodeId"
        >
          <component
            :is="item.node.to ? 'NuxtLink' : 'div'"
            :to="item.node.to"
            class="tree-row group relative flex items-center gap-2 h-11 px-2 rounded-md cursor-pointer transition-all duration-150 outline-none"
            :class="[
              item.node.id === activeNodeId 
                ? 'bg-primary-50 dark:bg-primary-950/40 font-medium' 
                : 'hover:bg-slate-100 dark:hover:bg-slate-800',
              'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1'
            ]"
            :style="{ paddingLeft: isCollapsed ? '8px' : `${item.depth * 16 + 8}px` }"
          >
            <!-- Selected bar -->
            <div
              v-if="item.node.id === activeNodeId"
              class="absolute left-0 top-2 bottom-2 w-[3px] bg-primary-500 rounded-full"
            />

            <!-- Chevron -->
            <button
              v-if="item.node.children?.length && !isCollapsed"
              type="button"
              class="w-6 h-6 flex items-center justify-center rounded-md transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
              @click.stop.prevent="toggleNode(item.node.id)"
            >
              <UIcon
                name="i-heroicons-chevron-right-20-solid"
                class="w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-150"
                :class="{ 'rotate-90': isExpanded(item.node.id) }"
              />
            </button>
            <div v-else-if="!isCollapsed" class="w-6 h-6 flex items-center justify-center">
              <div class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            <!-- Icon -->
            <Icon
              v-if="item.node.icon"
              :name="item.node.icon"
              class="w-4 h-4 flex-shrink-0"
              :class="item.node.id === activeNodeId ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'"
            />

            <!-- Label -->
            <span
              v-if="!isCollapsed"
              class="flex-1 truncate text-sm leading-relaxed"
              :class="item.node.id === activeNodeId ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300'"
            >
              {{ item.node.label }}
            </span>

            <!-- Count -->
            <span
              v-if="item.node.count !== undefined && !isCollapsed"
              class="text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
              :class="item.node.id === activeNodeId 
                ? 'bg-primary-200 dark:bg-primary-800 text-primary-700 dark:text-primary-200' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'"
            >
              {{ item.node.count }}
            </span>
          </component>
        </li>
      </ul>
    </div>

    <!-- Resize Handle -->
    <div
      v-if="!isCollapsed"
      class="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-primary-500/50 transition-colors group"
      @mousedown.prevent="startDragging"
    >
      <div class="absolute top-1/2 right-0 -translate-y-1/2 w-1 h-8 bg-slate-300 dark:bg-slate-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  </aside>
</template>

<style scoped>
.tree-row {
  font-size: 0.875rem;
  line-height: 1.4;
}
</style>
