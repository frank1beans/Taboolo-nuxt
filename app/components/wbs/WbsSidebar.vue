<script setup lang="ts">
import { ref, computed } from 'vue'
import type { WbsTreeNodeData } from './WbsTree.vue'
import WbsSidebarNode from './WbsSidebarNode.vue'

interface WbsSidebarProps {
  nodes: WbsTreeNodeData[]
  selectedNodeId?: string | null
  showAmounts?: boolean
  maxLevel?: number
}

const props = withDefaults(defineProps<WbsSidebarProps>(), {
  selectedNodeId: null,
  showAmounts: false,
  maxLevel: 7,
})

const emit = defineEmits<{
  'update:selectedNodeId': [id: string | null]
  'node-select': [node: WbsTreeNodeData | null]
}>()

const expandedNodes = ref<Set<string>>(new Set())

// Find node by ID recursively
const findNodeById = (nodes: WbsTreeNodeData[], id: string): WbsTreeNodeData | null => {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children?.length) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

// Get breadcrumb path
const selectedNodePath = computed(() => {
  if (!props.selectedNodeId) return []

  const path: WbsTreeNodeData[] = []
  const findPath = (nodes: WbsTreeNodeData[], targetId: string, currentPath: WbsTreeNodeData[]): boolean => {
    for (const node of nodes) {
      const newPath = [...currentPath, node]
      if (node.id === targetId) {
        path.push(...newPath)
        return true
      }
      if (node.children?.length && findPath(node.children, targetId, newPath)) {
        return true
      }
    }
    return false
  }

  findPath(props.nodes, props.selectedNodeId, [])
  return path
})

// Toggle node expansion
const toggleNode = (nodeId: string) => {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId)
  } else {
    expandedNodes.value.add(nodeId)
  }
}

// Select node
const selectNode = (node: WbsTreeNodeData) => {
  const newId = props.selectedNodeId === node.id ? null : node.id
  emit('update:selectedNodeId', newId)
  emit('node-select', newId ? node : null)

  // Auto-expand selected node
  if (newId) {
    expandedNodes.value.add(node.id)
  }
}

// Reset selection
const resetSelection = () => {
  emit('update:selectedNodeId', null)
  emit('node-select', null)
}

// Auto-expand first 2 levels on mount
const autoExpandInitialLevels = (nodes: WbsTreeNodeData[], currentLevel = 1) => {
  nodes.forEach((node) => {
    if (currentLevel <= 2) {
      expandedNodes.value.add(node.id)
      if (node.children?.length) {
        autoExpandInitialLevels(node.children, currentLevel + 1)
      }
    }
  })
}

// Initialize
autoExpandInitialLevels(props.nodes)

// Icon based on level (from original WbsFilterPanel)
const getNodeIcon = (level: number) => {
  return level <= 5 ? 'i-lucide-map-pin' : level === 6 ? 'i-lucide-folder' : 'i-lucide-file'
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header with Reset -->
    <div class="flex items-center justify-between p-4 border-b border-border">
      <div>
        <h3 class="font-semibold text-sm">Struttura WBS</h3>
        <p class="text-xs text-muted-foreground mt-0.5">Seleziona un nodo per filtrare</p>
      </div>
      <UButton
        v-if="selectedNodeId"
        size="xs"
        variant="ghost"
        color="gray"
        @click="resetSelection"
      >
        <UIcon name="i-lucide-x-circle" class="mr-1 h-3 w-3" />
        Reset
      </UButton>
    </div>

    <!-- Breadcrumb -->
    <div v-if="selectedNodePath.length > 0" class="px-4 py-2 bg-primary/5 border-b border-border">
      <div class="flex items-center gap-1 text-xs overflow-x-auto">
        <UIcon name="i-lucide-filter" class="h-3 w-3 text-primary flex-shrink-0" />
        <span class="text-muted-foreground flex-shrink-0">Filtro:</span>
        <div class="flex items-center gap-1 flex-wrap">
          <template v-for="(node, index) in selectedNodePath" :key="node.id">
            <UIcon v-if="index > 0" name="i-lucide-chevron-right" class="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span class="font-mono text-xs bg-primary/10 px-1.5 py-0.5 rounded">
              {{ node.code }}
            </span>
          </template>
        </div>
      </div>
    </div>

    <!-- Tree -->
    <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
      <WbsSidebarNode
        v-for="node in nodes"
        :key="node.id"
        :node="node"
        :selected-node-id="selectedNodeId"
        :expanded-nodes="expandedNodes"
        :max-level="maxLevel"
        :show-amounts="showAmounts"
        :get-node-icon="getNodeIcon"
        @toggle="toggleNode"
        @select="selectNode"
      />
    </div>
  </div>
</template>
