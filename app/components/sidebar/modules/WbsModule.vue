<script setup lang="ts">
/**
 * WbsModule.vue
 * 
 * WBS tree module for the sidebar system.
 * Displays hierarchical WBS structure with search, expand/collapse.
 */
import { ref, computed, watch, unref, type Ref } from 'vue'
import { formatCurrencyCompact } from '~/lib/formatters'

export interface WbsNode {
  id: string
  code: string
  name: string
  level: number
  count?: number
  amount?: number
  children?: WbsNode[]
}

type MaybeRef<T> = T | Ref<T>

const props = withDefaults(defineProps<{
  nodes?: MaybeRef<WbsNode[]>
  selectedNodeId?: MaybeRef<string | null>
}>(), {
  nodes: () => [],
  selectedNodeId: null
})

const emit = defineEmits<{
  'node-selected': [node: WbsNode | null]
}>()

// State
const expandedNodes = ref(new Set<string>())
const selectedNode = ref<WbsNode | null>(null)
const searchQuery = ref('')

// Computed
const resolvedNodes = computed(() => unref(props.nodes) ?? [])
const resolvedSelectedNodeId = computed(() => unref(props.selectedNodeId) ?? null)
const totalNodes = computed(() => countNodes(resolvedNodes.value))

const countNodes = (nodes: WbsNode[]): number => {
  let count = nodes.length
  for (const node of nodes) {
    if (node.children?.length) {
      count += countNodes(node.children)
    }
  }
  return count
}

const countItemsInNode = (node: WbsNode): number => {
  let count = node.count || 0
  if (node.children?.length) {
    for (const child of node.children) {
      count += countItemsInNode(child)
    }
  }
  return count
}

const formatAmount = (amount: number): string => formatCurrencyCompact(amount)

const getNodeTooltip = (node: WbsNode): string => {
  const itemCount = countItemsInNode(node)
  const totalAmount = node.amount || 0
  if (totalAmount > 0) {
    return `${itemCount} voci · ${formatAmount(totalAmount)}`
  }
  return `${itemCount} voci`
}

// Search filtering
const filterNodes = (nodes: WbsNode[], query: string): WbsNode[] => {
  if (!query.trim()) return nodes
  const lowerQuery = query.toLowerCase()
  
  return nodes.reduce<WbsNode[]>((acc, node) => {
    const matchesCode = node.code?.toLowerCase().includes(lowerQuery)
    const matchesName = node.name?.toLowerCase().includes(lowerQuery)
    const filteredChildren = node.children ? filterNodes(node.children, query) : []
    
    if (matchesCode || matchesName || filteredChildren.length > 0) {
      acc.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children
      })
    }
    return acc
  }, [])
}

const filteredNodes = computed(() => filterNodes(resolvedNodes.value, searchQuery.value))

// Auto-expand when searching
watch(searchQuery, (query) => {
  if (query.trim()) {
    const expandAllFiltered = (nodes: WbsNode[]) => {
      nodes.forEach(node => {
        expandedNodes.value.add(node.id)
        if (node.children?.length) {
          expandAllFiltered(node.children)
        }
      })
    }
    expandAllFiltered(filteredNodes.value)
  }
})

// Sync selection from parent when provided
watch(
  () => [resolvedSelectedNodeId.value, resolvedNodes.value] as const,
  ([nextSelectedId]) => {
    if (!nextSelectedId) {
      selectedNode.value = null
      return
    }
    selectedNode.value = findNodeById(resolvedNodes.value, nextSelectedId)
  },
  { immediate: true }
)

// Actions
const toggleNode = (nodeId: string, parentId?: string) => {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId)
  } else {
    // Auto-collapse siblings
    if (parentId) {
      const parentNode = findNodeById(resolvedNodes.value, parentId)
      if (parentNode?.children) {
        parentNode.children.forEach(sibling => {
          if (sibling.id !== nodeId) {
            expandedNodes.value.delete(sibling.id)
          }
        })
      }
    } else {
      resolvedNodes.value.forEach(sibling => {
        if (sibling.id !== nodeId) {
          expandedNodes.value.delete(sibling.id)
        }
      })
    }
    expandedNodes.value.add(nodeId)
  }
}

const findNodeById = (nodes: WbsNode[], id: string): WbsNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

const selectNode = (node: WbsNode) => {
  if (selectedNode.value?.id === node.id) {
    selectedNode.value = null
    emit('node-selected', null)
  } else {
    selectedNode.value = node
    emit('node-selected', node)
  }
}

const expandAll = () => {
  const traverse = (nodes: WbsNode[]) => {
    nodes.forEach(node => {
      if (node.children?.length) {
        expandedNodes.value.add(node.id)
        traverse(node.children)
      }
    })
  }
  traverse(resolvedNodes.value)
}

const collapseAll = () => {
  expandedNodes.value.clear()
}
const clearSearch = () => {
  searchQuery.value = ''
}
</script>

<template>
  <SidebarModule 
    title="WBS" 
    :subtitle="`${totalNodes} nodi`"
    icon="heroicons:squares-2x2"
    hide-header
  >
    <template #header-actions>
      <div class="flex items-center gap-0.5">
        <UTooltip text="Espandi tutto">
          <UButton icon="i-heroicons-arrows-pointing-out" color="neutral" variant="ghost" size="xs" @click="expandAll" />
        </UTooltip>
        <UTooltip text="Collassa tutto">
          <UButton icon="i-heroicons-arrows-pointing-in" color="neutral" variant="ghost" size="xs" @click="collapseAll" />
        </UTooltip>
      </div>
    </template>

    <!-- Search -->
    <div class="mb-3">
      <div class="relative">
        <Icon 
          name="heroicons:magnifying-glass" 
          class="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[hsl(var(--muted-foreground))]" 
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cerca..."
          class="w-full h-7 pl-7 pr-7 text-xs bg-[hsl(var(--muted)/0.3)] rounded border-none focus:ring-1 focus:ring-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
        >
        <button
          v-if="searchQuery"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          aria-label="Cancella ricerca"
          @click="clearSearch"
        >
          <Icon name="heroicons:x-mark" class="w-3 h-3" />
        </button>
      </div>
      <div v-if="searchQuery && filteredNodes.length !== resolvedNodes.length" class="mt-1 text-micro text-[hsl(var(--muted-foreground))]">
        {{ filteredNodes.length }}/{{ resolvedNodes.length }}
      </div>
    </div>

    <!-- Tree -->
    <ul v-if="filteredNodes.length > 0" class="space-y-0.5">
      <WbsTreeNode
        v-for="node in filteredNodes"
        :key="node.id"
        :node="node"
        :depth="0"
        :expanded-nodes="expandedNodes"
        :selected-node="selectedNode"
        :get-tooltip="getNodeTooltip"
        @toggle="toggleNode"
        @select="selectNode"
      />
    </ul>
    
    <!-- Empty states -->
    <div v-else-if="searchQuery" class="text-center py-6">
      <Icon name="heroicons:magnifying-glass" class="w-6 h-6 text-[hsl(var(--muted-foreground))] mb-2 mx-auto opacity-50" />
      <p class="text-xs text-[hsl(var(--muted-foreground))] mb-2">Nessun nodo trovato</p>
      <button 
        class="text-xs text-[hsl(var(--primary))] hover:underline"
        @click="clearSearch"
      >
        Cancella ricerca
      </button>
    </div>
    <div v-else class="text-center py-6">
      <p class="text-xs text-[hsl(var(--muted-foreground))]">Nessuna struttura WBS</p>
    </div>
  </SidebarModule>
</template>
