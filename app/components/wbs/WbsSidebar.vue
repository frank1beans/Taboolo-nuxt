<template>
  <aside
    v-if="visible"
    ref="sidebarRef"
    class="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-sm overflow-hidden relative"
    :style="{ 
      width: `${sidebarWidth}px`,
      minWidth: '200px',
      maxWidth: '500px',
      height: 'calc(100vh - 120px)', 
      maxHeight: 'calc(100vh - 120px)' 
    }"
  >
    <!-- Header -->
    <div class="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-folder-tree" class="w-4 h-4 text-primary-500" />
        <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">WBS</span>
        <UBadge 
          v-if="totalNodes > 0" 
          color="neutral" 
          variant="soft" 
          size="xs"
          :aria-label="`${totalNodes} nodi totali`"
        >
          {{ totalNodes }}
        </UBadge>
      </div>
      <div class="flex items-center gap-0.5">
        <UButton
          icon="i-heroicons-arrows-pointing-in"
          color="neutral"
          variant="ghost"
          size="xs"
          title="Espandi tutto"
          aria-label="Espandi tutti i nodi"
          @click="expandAll"
        />
        <UButton
          icon="i-heroicons-arrows-pointing-out"
          color="neutral"
          variant="ghost"
          size="xs"
          title="Collassa tutto"
          aria-label="Collassa tutti i nodi"
          @click="collapseAll"
        />
        <UButton
          icon="i-heroicons-x-mark"
          color="neutral"
          variant="ghost"
          size="xs"
          title="Chiudi sidebar"
          aria-label="Chiudi sidebar WBS"
          @click="toggleVisible(false)"
        />
      </div>
    </div>

    <!-- Tree Content -->
    <div class="flex-1 overflow-y-auto py-2 px-1">
      <ul 
        v-if="nodes.length > 0"
        role="tree" 
        aria-label="Struttura WBS"
        class="space-y-0.5"
      >
        <WbsTreeNode
          v-for="node in nodes"
          :key="node.id"
          :node="node"
          :depth="0"
          :expanded-nodes="expandedNodes"
          :selected-node="selectedNode"
          @toggle="toggleNode"
          @select="selectNode"
        />
      </ul>

      <!-- Empty State -->
      <div v-else class="text-center py-8 px-4">
        <UIcon name="i-heroicons-folder-open" class="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p class="text-sm text-slate-500 dark:text-slate-400">Nessun nodo WBS</p>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">La struttura WBS apparirà qui</p>
      </div>
    </div>

    <!-- Resize Handle -->
    <div
      class="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-primary-500/50 transition-colors group"
      @mousedown="startResize"
    >
      <div class="absolute top-1/2 right-0 -translate-y-1/2 w-1 h-8 bg-slate-300 dark:bg-slate-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue';

export interface WbsSidebarNode {
  id: string;
  code: string;
  name: string;
  level: number;
  children?: WbsSidebarNode[];
}

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    visible?: boolean;
    nodes?: WbsSidebarNode[];
    showLevel?: boolean;
  }>(),
  {
    modelValue: true,
    visible: true,
    nodes: () => [],
    showLevel: false,
  }
);

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'node-selected': [node: WbsSidebarNode | null];
}>();

const visible = ref(props.visible ?? props.modelValue ?? true);
const selectedNode = ref<WbsSidebarNode | null>(null);
const expandedNodes = ref(new Set<string>());

// Resize state
const sidebarRef = ref<HTMLElement | null>(null);
const sidebarWidth = ref(288);
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartWidth = ref(0);

// Count total nodes recursively
const countNodes = (nodes: WbsSidebarNode[]): number => {
  let count = nodes.length;
  for (const node of nodes) {
    if (node.children?.length) {
      count += countNodes(node.children);
    }
  }
  return count;
};

const totalNodes = computed(() => countNodes(props.nodes));

watch(
  () => props.visible,
  (val) => {
    if (val !== undefined) visible.value = val;
  }
);

// Resize handlers
const startResize = (e: MouseEvent) => {
  isDragging.value = true;
  dragStartX.value = e.clientX;
  dragStartWidth.value = sidebarWidth.value;
  
  document.addEventListener('mousemove', handleDragging);
  document.addEventListener('mouseup', stopResize);
};

const handleDragging = (e: MouseEvent) => {
  if (!isDragging.value) return;
  const delta = e.clientX - dragStartX.value;
  const newWidth = dragStartWidth.value + delta;
  sidebarWidth.value = Math.min(500, Math.max(200, newWidth));
};

const stopResize = () => {
  if (!isDragging.value) return;
  isDragging.value = false;
  document.removeEventListener('mousemove', handleDragging);
  document.removeEventListener('mouseup', stopResize);
};

onUnmounted(() => {
  document.removeEventListener('mousemove', handleDragging);
  document.removeEventListener('mouseup', stopResize);
});

const toggleNode = (nodeId: string) => {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId);
  } else {
    expandedNodes.value.add(nodeId);
  }
};

const selectNode = (node: WbsSidebarNode) => {
  if (selectedNode.value?.id === node.id) {
    selectedNode.value = null;
    emit('node-selected', null);
  } else {
    selectedNode.value = node;
    emit('node-selected', node);
  }
};

const expandAllRecursive = (nodes: WbsSidebarNode[]) => {
  for (const node of nodes) {
    if (node.children?.length) {
      expandedNodes.value.add(node.id);
      expandAllRecursive(node.children);
    }
  }
};

const expandAll = () => {
  expandAllRecursive(props.nodes);
};

const collapseAll = () => {
  selectedNode.value = null;
  expandedNodes.value.clear();
  emit('node-selected', null);
};

const toggleVisible = (val: boolean) => emit('update:visible', val);
</script>
