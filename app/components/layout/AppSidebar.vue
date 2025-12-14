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
  expandedState.value[nodeId] = !expandedState.value[nodeId]
}

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

const itemPadding = (depth: number) =>
  props.isCollapsed ? '0.4rem' : `${0.7 + depth * 0.75}rem`

const showEmptyState = computed(() => !props.nodes.length && props.hasProject && !props.loading)
</script>

<template>
  <aside
    class="app-sidebar relative flex h-screen flex-col shadow-inner"
    :style="{
      width: `${width}px`,
      minWidth: `${isCollapsed ? collapsedWidth : minWidth}px`,
      maxWidth: `${maxWidth}px`,
    }"
  >
    <div class="flex items-center gap-3 px-3 pb-4 pt-5">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]"
        >
          <Icon name="heroicons:rectangle-group" class="h-5 w-5" />
        </div>
        <div v-if="!isCollapsed" class="flex flex-col">
          <span class="text-sm font-semibold text-[hsl(var(--sidebar-foreground))]">Struttura</span>
          <span class="text-xs text-[hsl(var(--muted-foreground))]">Progetto / Preventivo</span>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-auto px-2 pb-6">
      <div
        v-if="!hasProject && !loading && !isCollapsed"
        class="mb-4 space-y-2 px-2 text-sm text-[hsl(var(--sidebar-foreground))]"
      >
        <p class="text-sm font-semibold text-[hsl(var(--sidebar-foreground))]">Seleziona un progetto</p>
        <p class="text-xs text-[hsl(var(--muted-foreground))]">Apri un progetto per vedere la struttura.</p>
        <UButton
          to="/projects"
          color="primary"
          variant="ghost"
          size="xs"
          class="inline-flex items-center gap-1.5 border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/0.35)] text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent)/0.6)]"
        >
          <Icon name="heroicons:arrow-right" class="h-4 w-4" />
          Vai a Progetti
        </UButton>
      </div>

      <div
        v-else-if="showEmptyState && !isCollapsed"
        class="mb-4 rounded-lg border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/0.35)] p-3 text-sm text-[hsl(var(--sidebar-foreground))] shadow-inner"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--sidebar-accent)/0.6)] text-[hsl(var(--sidebar-foreground))]"
          >
            <Icon name="heroicons:information-circle" class="h-5 w-5" />
          </div>
          <div>
            <p class="text-sm font-semibold text-[hsl(var(--sidebar-foreground))]">Seleziona un preventivo</p>
            <p class="text-xs text-[hsl(var(--muted-foreground))]">Il progetto corrente non ha un preventivo selezionato.</p>
          </div>
        </div>
      </div>

      <ul v-else class="space-y-1">
        <li v-for="item in visibleNodes" :key="item.node.id">
          <div
            class="group app-nav-item rounded-lg text-sm"
            :class="{
              'app-nav-item--active shadow-inner': item.node.id === activeNodeId,
              'px-2 py-2': !isCollapsed,
              'px-1.5 py-2 justify-center': isCollapsed,
            }"
            :style="{ paddingLeft: itemPadding(item.depth) }"
            :title="isCollapsed ? item.node.label : undefined"
          >
            <button
              v-if="item.node.children?.length"
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-md border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/0.35)] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--sidebar-accent)/0.6)]"
              @click.stop="toggleNode(item.node.id)"
            >
              <Icon
                :name="expandedState[item.node.id] === false ? 'heroicons:chevron-right' : 'heroicons:chevron-down'"
                class="h-4 w-4"
            />
            </button>
            <span
              v-else
              class="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[hsl(var(--muted-foreground))]"
            >
              <Icon name="heroicons:dot" class="h-4 w-4" />
            </span>

            <Icon
              v-if="item.node.icon"
              :name="item.node.icon"
              class="h-5 w-5 flex-shrink-0 text-[hsl(var(--sidebar-foreground))]"
            />

            <component
              :is="item.node.to ? 'NuxtLink' : 'div'"
              :to="item.node.to"
              class="flex flex-1 items-center gap-2"
            >
              <span v-if="!isCollapsed" class="truncate font-medium text-[hsl(var(--sidebar-foreground))]">
                {{ item.node.label }}
              </span>
            </component>

            <span
              v-if="item.node.count !== undefined && !isCollapsed"
              class="ml-auto inline-flex items-center rounded-full bg-[hsl(var(--sidebar-accent)/0.6)] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--sidebar-foreground))]"
            >
              {{ item.node.count }}
            </span>
          </div>
        </li>
      </ul>
    </div>

    <div
      v-if="!isCollapsed"
      class="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent transition hover:bg-[hsl(var(--sidebar-accent)/0.6)]"
      @mousedown.prevent="startDragging"
    />
  </aside>
</template>
