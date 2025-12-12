<script setup lang="ts">
import type { WbsTreeNodeData } from './WbsTree.vue'

interface WbsSidebarNodeProps {
  node: WbsTreeNodeData
  selectedNodeId?: string | null
  expandedNodes: Set<string>
  maxLevel?: number
  showAmounts?: boolean
  getNodeIcon: (level: number) => string
}

const props = withDefaults(defineProps<WbsSidebarNodeProps>(), {
  selectedNodeId: null,
  maxLevel: 7,
  showAmounts: false,
})

const emit = defineEmits<{
  toggle: [nodeId: string]
  select: [node: WbsTreeNodeData]
}>()

const isExpanded = computed(() => props.expandedNodes.has(props.node.id))
const isSelected = computed(() => props.selectedNodeId === props.node.id)
const hasChildren = computed(() => props.node.children && props.node.children.length > 0)
const shouldShowChildren = computed(() => props.node.level < props.maxLevel)
</script>

<template>
  <div class="mb-1">
    <!-- Node Row -->
    <div
      class="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-colors group"
      :class="{
        'bg-primary/10 text-primary font-medium': isSelected,
        'hover:bg-muted/60': !isSelected,
      }"
      @click="emit('select', node)"
    >
      <!-- Expand/Collapse Button -->
      <button
        v-if="hasChildren && shouldShowChildren"
        class="flex-shrink-0 p-0.5 hover:bg-background/50 rounded transition-transform"
        :class="{ 'rotate-90': isExpanded }"
        @click.stop="emit('toggle', node.id)"
      >
        <UIcon name="i-lucide-chevron-right" class="h-3.5 w-3.5" />
      </button>
      <div v-else class="w-4 flex-shrink-0" />

      <!-- Icon -->
      <UIcon
        :name="getNodeIcon(node.level)"
        class="h-3.5 w-3.5 flex-shrink-0"
        :class="{
          'text-primary': isSelected,
          'text-muted-foreground': !isSelected,
        }"
      />

      <!-- Code -->
      <span
        class="font-mono text-xs px-1.5 py-0.5 rounded flex-shrink-0"
        :class="{
          'bg-primary text-primary-foreground': isSelected,
          'bg-muted text-muted-foreground group-hover:bg-background': !isSelected,
        }"
      >
        {{ node.code }}
      </span>

      <!-- Description -->
      <span
        class="text-sm flex-1 truncate"
        :class="{
          'text-primary font-medium': isSelected,
          'text-foreground': !isSelected,
        }"
        :title="node.description || undefined"
      >
        {{ node.description || '—' }}
      </span>

      <!-- Category Badge -->
      <span
        v-if="node.category"
        class="text-[10px] uppercase px-1.5 py-0.5 rounded flex-shrink-0"
        :class="{
          'bg-primary/20 text-primary': isSelected,
          'bg-muted text-muted-foreground': !isSelected,
        }"
      >
        {{ node.category }}
      </span>
    </div>

    <!-- Children -->
    <div
      v-if="hasChildren && shouldShowChildren && isExpanded"
      class="ml-5 border-l border-border/50 pl-2 mt-1"
    >
      <WbsSidebarNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-node-id="selectedNodeId"
        :expanded-nodes="expandedNodes"
        :max-level="maxLevel"
        :show-amounts="showAmounts"
        :get-node-icon="getNodeIcon"
        @toggle="emit('toggle', $event)"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>
