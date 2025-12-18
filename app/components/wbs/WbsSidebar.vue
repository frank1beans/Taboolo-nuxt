<template>
  <aside
    v-if="visible"
    ref="sidebarRef"
    class="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl flex flex-col shadow-sm overflow-hidden relative"
    :style="{ 
      width: `${sidebarWidth}px`,
      minWidth: '200px',
      maxWidth: '500px',
      height: 'calc(100vh - 120px)', 
      maxHeight: 'calc(100vh - 120px)' 
    }"
  >
    <!-- Header -->
    <div class="h-[72px] px-4 border-b border-[hsl(var(--border))] flex items-center justify-between flex-shrink-0 bg-[hsl(var(--card))]">
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-list-bullet" class="w-5 h-5 text-[hsl(var(--primary))]" />
        <span class="text-sm font-bold text-[hsl(var(--foreground))] tracking-wide">WBS</span>
        <UBadge 
          v-if="totalNodes > 0" 
          color="neutral" 
          variant="subtle" 
          size="xs"
          class="ml-1"
          :aria-label="`${totalNodes} nodi totali`"
        >
          {{ totalNodes }}
        </UBadge>
      </div>
      <div class="flex items-center gap-1">
        <UButton
          icon="i-heroicons-arrows-pointing-out"
          color="neutral"
          variant="ghost"
          size="xs"
          title="Espandi tutto"
          class="transition-transform active:scale-90 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          @click="expandAll"
        />
        <UButton
          icon="i-heroicons-arrows-pointing-in"
          color="neutral"
          variant="ghost"
          size="xs"
          title="Collassa tutto"
          class="transition-transform active:scale-90 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          @click="collapseAll"
        />
        <div class="w-px h-4 bg-[hsl(var(--border))] mx-1" />
        <UButton
          icon="i-heroicons-x-mark"
          color="neutral"
          variant="ghost"
          size="xs"
          title="Chiudi sidebar"
          class="transition-transform active:scale-90 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
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
        <UIcon name="i-heroicons-folder-open" class="w-10 h-10 mx-auto mb-3 text-[hsl(var(--muted-foreground)/0.5)]" />
        <p class="text-sm text-[hsl(var(--muted-foreground))]">Nessun nodo WBS</p>
        <p class="text-xs text-[hsl(var(--muted-foreground)/0.7)] mt-1">La struttura WBS apparirà qui</p>
      </div>
    </div>

    <!-- Resize Handle -->
    <div
      class="absolute top-0 left-0 w-1 h-full cursor-ew-resize hover:bg-[hsl(var(--primary)/0.5)] transition-colors group z-20"
      @mousedown="startResize"
    >
      <div class="absolute top-1/2 left-0 -translate-y-1/2 w-1 h-8 bg-[hsl(var(--border))] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
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
  const delta = dragStartX.value - e.clientX;
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
