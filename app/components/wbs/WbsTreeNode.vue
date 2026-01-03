<template>
  <div class="select-none">
    <div
      role="treeitem"
      :aria-expanded="hasChildren ? isExpanded : undefined"
      :aria-selected="isSelected"
      :tabindex="depth === 0 ? 0 : -1"
      class="group flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200 outline-none select-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-1"
      :class="[
        isSelected
          ? 'bg-[hsl(var(--primary))/0.1] text-[hsl(var(--primary))] font-semibold'
          : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))/0.5] hover:text-[hsl(var(--foreground))]'
      ]"
      :style="{ paddingLeft: `${depth * 16 + 12}px` }"
      @click="handleClick"
      @keydown="handleKeydown"
    >
      <div class="w-5 h-5 flex items-center justify-center">
        <button
          v-if="hasChildren"
          type="button"
          class="w-5 h-5 flex items-center justify-center rounded transition-colors"
          :class="isSelected ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]'"
          :aria-label="isExpanded ? 'Collassa' : 'Espandi'"
          @click.stop="$emit('toggle', node.id)"
        >
          <UIcon
            name="i-heroicons-chevron-right-20-solid"
            class="w-3.5 h-3.5 transition-transform duration-200"
            :class="{ 'rotate-90': isExpanded }"
          />
        </button>
        <div
          v-else
          class="w-1.5 h-1.5 rounded-full"
          :class="isSelected ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--border))]'"
        />
      </div>

      <span
        class="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border"
        :class="isSelected
          ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
          : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]'"
        title="Livello WBS"
      >
        L{{ node.level }}
      </span>

      <span class="flex-1 truncate text-sm" :title="node.name">
        {{ node.name }}
      </span>

      <span
        v-if="hasChildren"
        class="text-[10px] font-medium px-2 py-0.5 rounded-full"
        :class="isSelected
          ? 'bg-[hsl(var(--primary))/0.2] text-[hsl(var(--primary))]'
          : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'"
      >
        {{ node.children?.length }}
      </span>
    </div>

    <div v-if="hasChildren && isExpanded" role="group" class="mt-0.5 space-y-0.5">
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
import type { WbsNode } from '~/types/wbs';

const props = defineProps<{
  node: WbsNode;
  depth: number;
  expandedNodes: Set<string>;
  selectedNode: WbsNode | null;
}>();

const emit = defineEmits<{
  toggle: [nodeId: string];
  select: [node: WbsNode];
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
