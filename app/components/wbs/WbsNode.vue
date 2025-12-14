<template>
  <div>
    <UButton
      variant="ghost"
      color="gray"
      size="sm"
      class="w-full text-left px-3 py-2 rounded-md transition flex items-center gap-2 group hover:bg-[hsl(var(--muted)/0.6)]"
      :class="[
        selected ? 'bg-[hsl(var(--accent)/0.35)] text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]',
        `pl-${indentLevel * 4 + 3}`,
      ]"
      :style="{ paddingLeft: `${indentLevel * 16 + 12}px` }"
      type="button"
      @click="handleClick"
    >
      <!-- Expand/Collapse Icon -->
      <span
        v-if="node.children && node.children.length > 0"
        class="text-xs transition-transform"
        :class="expanded ? 'rotate-90' : ''"
      >
        ▶
      </span>
      <span v-else class="text-xs opacity-0">▶</span>

      <!-- Node Icon based on type -->
      <span class="text-sm">
        {{ node.type === 'spatial' ? '📍' : '📦' }}
      </span>

      <!-- Node Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline gap-2">
          <span class="font-mono text-xs font-semibold">{{ node.code }}</span>
          <span v-if="showLevel" class="text-[10px] opacity-60">L{{ node.level }}</span>
        </div>
        <div v-if="node.description" class="text-xs opacity-80 truncate">
          {{ node.description }}
        </div>
      </div>

      <!-- Optional badge with count -->
      <UBadge v-if="node.project_amount !== undefined" color="gray" variant="soft" size="xs">
        {{ formatAmount(node.project_amount) }}
      </UBadge>
    </UButton>

    <!-- Recursive Children -->
    <div v-if="expanded && node.children && node.children.length > 0" class="mt-1">
      <WbsNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :indent-level="indentLevel + 1"
        :expanded-nodes="expandedNodes"
        :selected-node-id="selectedNodeId"
        :show-level="showLevel"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { WbsNode as WbsNodeType } from '~/types/wbs';

const props = withDefaults(
  defineProps<{
    node: WbsNodeType;
    indentLevel?: number;
    expandedNodes: Set<string>;
    selectedNodeId?: string | null;
    showLevel?: boolean;
  }>(),
  {
    indentLevel: 0,
    selectedNodeId: null,
    showLevel: false,
  }
);

const emit = defineEmits<{
  select: [node: WbsNodeType];
  toggle: [nodeId: string];
}>();

const expanded = computed(() => props.expandedNodes.has(props.node.id));
const selected = computed(() => props.selectedNodeId === props.node.id);

const handleClick = () => {
  // Toggle expand if has children
  if (props.node.children && props.node.children.length > 0) {
    emit('toggle', props.node.id);
  }
  // Always emit select
  emit('select', props.node);
};

const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
</script>
