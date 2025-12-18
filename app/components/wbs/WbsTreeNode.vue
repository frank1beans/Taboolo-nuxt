<template>
  <div class="select-none relative">
    <!-- Connecting line (vertical) for this node towards its siblings -->
    <!-- Managed by parent for the list, but we need lines inside children -->
    
    <!-- Node Row -->
    <div
      role="treeitem"
      :aria-expanded="hasChildren ? isExpanded : undefined"
      :aria-selected="isSelected"
      :tabindex="depth === 0 ? 0 : -1"
      class="group relative flex items-center gap-2.5 py-1.5 px-2 mb-0.5 rounded-lg cursor-pointer transition-all duration-150 outline-none border border-transparent"
      :class="[
        isSelected 
          ? 'bg-[hsl(var(--primary)/0.1)] border-[hsl(var(--primary)/0.2)]' 
          : 'hover:bg-[hsl(var(--muted)/0.8)]',
        'focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-1'
      ]"
      :style="{ paddingLeft: `${depth * 16 + 8}px` }"
      @click="handleClick"
      @keydown="handleKeydown"
    >
      <!-- Active Indicator (Left Bar) -->
      <div
        v-if="isSelected"
        class="absolute left-0 top-1 bottom-1 w-[3px] bg-[hsl(var(--primary))] rounded-r-full"
      />

      <!-- Chevron / Leaf Indicator -->
      <button
        v-if="hasChildren"
        type="button"
        class="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-[hsl(var(--muted)/0.8)] text-[hsl(var(--muted-foreground))]"
        :aria-label="isExpanded ? 'Collassa' : 'Espandi'"
        @click.stop="$emit('toggle', node.id)"
      >
        <UIcon
          name="i-heroicons-chevron-right-20-solid"
          class="w-3.5 h-3.5 transition-transform duration-200"
          :class="{ 'rotate-90': isExpanded, 'text-[hsl(var(--foreground))]': isSelected }"
        />
      </button>
      <!-- Leaf Node Icon (Dot) -->
      <div v-else class="w-5 h-5 flex items-center justify-center">
        <div class="w-1.5 h-1.5 rounded-full bg-[hsl(var(--border))]" :class="{ 'bg-[hsl(var(--primary))]': isSelected }" />
      </div>

      <!-- Level Badge (Minimalist) -->
      <div 
         class="h-5 px-1.5 rounded text-[10px] font-bold flex items-center justify-center shadow-sm border"
         :class="isSelected 
            ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]' 
            : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]'"
         title="Livello WBS"
      >
        L{{ node.level }}
      </div>

      <!-- Name & Info -->
      <div class="flex-1 min-w-0 flex flex-col justify-center">
         <span
          class="truncate text-sm font-medium leading-tight transition-colors"
          :class="isSelected ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'"
          :title="node.name"
        >
          {{ node.name }}
        </span>
      </div>

      <!-- Children Count Badge -->
      <span
        v-if="hasChildren"
        class="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 transition-colors"
        :class="isSelected 
          ? 'bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary-dark))]' 
          : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'"
      >
        {{ node.children?.length }}
      </span>
    </div>

    <!-- Children (recursive) -->
    <div v-if="hasChildren && isExpanded" role="group" class="relative">
      <!-- Continuous Guide Line -->
      <div
        class="absolute top-0 bottom-1 w-px bg-[hsl(var(--border))]"
        :style="{ left: `${(depth + 1) * 16 + 10}px` }"
      />
      
      <WbsTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :expanded-nodes="expandedNodes"
        :selected-node="selectedNode"
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>


<script setup lang="ts">
import { computed } from 'vue';
import type { WbsSidebarNode } from './WbsSidebar.vue';

const props = defineProps<{
  node: WbsSidebarNode;
  depth: number;
  expandedNodes: Set<string>;
  selectedNode: WbsSidebarNode | null;
}>();

const emit = defineEmits<{
  toggle: [nodeId: string];
  select: [node: WbsSidebarNode];
}>();

const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0);
const isExpanded = computed(() => props.expandedNodes.has(props.node.id));
const isSelected = computed(() => props.selectedNode?.id === props.node.id);

const handleClick = () => {
  if (hasChildren.value) {
    emit('toggle', props.node.id);
  }
  emit('select', props.node);
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleClick();
  }
  if (e.key === 'ArrowRight' && hasChildren.value && !isExpanded.value) {
    e.preventDefault();
    emit('toggle', props.node.id);
  }
  if (e.key === 'ArrowLeft' && hasChildren.value && isExpanded.value) {
    e.preventDefault();
    emit('toggle', props.node.id);
  }
};
</script>

<style scoped>
.tree-row {
  font-size: 0.875rem;
  line-height: 1.4;
}
</style>
