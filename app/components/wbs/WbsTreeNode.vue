<template>
  <div class="select-none">
    <!-- Node Row - Fixed height 44px, full row clickable -->
    <div
      role="treeitem"
      :aria-expanded="hasChildren ? isExpanded : undefined"
      :aria-selected="isSelected"
      :tabindex="depth === 0 ? 0 : -1"
      class="tree-row group relative flex items-center gap-2 h-11 px-2 rounded-md cursor-pointer transition-all duration-150 outline-none"
      :class="[
        isSelected 
          ? 'bg-primary-50 dark:bg-primary-950/40 font-medium' 
          : 'hover:bg-slate-100 dark:hover:bg-slate-800',
        'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1'
      ]"
      :style="{ paddingLeft: `${depth * 16 + 8}px` }"
      @click="handleClick"
      @keydown="handleKeydown"
    >
      <!-- Selected indicator bar -->
      <div
        v-if="isSelected"
        class="absolute left-0 top-2 bottom-2 w-[3px] bg-primary-500 rounded-full"
      />

      <!-- Chevron (always left, animated rotation) -->
      <button
        v-if="hasChildren"
        type="button"
        class="w-6 h-6 flex items-center justify-center rounded-md transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
        :aria-label="isExpanded ? 'Collassa' : 'Espandi'"
        @click.stop="$emit('toggle', node.id)"
      >
        <UIcon
          name="i-heroicons-chevron-right-20-solid"
          class="w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-150"
          :class="{ 'rotate-90': isExpanded }"
        />
      </button>
      <div v-else class="w-6 h-6 flex items-center justify-center">
        <div class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
      </div>

      <!-- Level Badge -->
      <span
        class="text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded flex-shrink-0"
        :class="isSelected 
          ? 'bg-primary-200 dark:bg-primary-800 text-primary-700 dark:text-primary-200' 
          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'"
      >
        {{ node.level }}
      </span>

      <!-- Name -->
      <span
        class="flex-1 truncate text-sm leading-relaxed"
        :class="isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300'"
        :title="node.name"
      >
        {{ node.name }}
      </span>

      <!-- Children Count -->
      <span
        v-if="hasChildren"
        class="text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
        :class="isSelected 
          ? 'bg-primary-200 dark:bg-primary-800 text-primary-700 dark:text-primary-200' 
          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'"
        :aria-label="`${node.children?.length} elementi`"
      >
        {{ node.children?.length }}
      </span>
    </div>

    <!-- Children (recursive) -->
    <ul v-if="hasChildren && isExpanded" role="group" class="relative">
      <!-- Connecting line -->
      <div
        class="absolute top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700"
        :style="{ left: `${(depth + 1) * 16 + 16}px` }"
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
    </ul>
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
