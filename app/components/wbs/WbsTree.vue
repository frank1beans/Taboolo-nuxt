<template>
  <div class="flex flex-col h-full">
    <!-- Tree Controls -->
    <div class="px-3 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))] flex items-center justify-between">
      <span class="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">WBS Tree</span>
      <div class="flex items-center gap-1">
        <UButton
          icon="i-heroicons-chevron-down"
          size="2xs"
          variant="ghost"
          color="gray"
          title="Espandi tutto"
          @click="$emit('expand-all')"
        />
        <UButton
          icon="i-heroicons-chevron-up"
          size="2xs"
          variant="ghost"
          color="gray"
          title="Comprimi tutto"
          @click="$emit('collapse-all')"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-[hsl(var(--muted-foreground))] text-sm">Caricamento...</div>
    </div>

    <!-- Tree Nodes -->
    <div v-else-if="nodes.length > 0" class="flex-1 overflow-y-auto py-2">
      <WbsNode
        v-for="node in nodes"
        :key="node.id"
        :node="node"
        :expanded-nodes="expandedNodes"
        :selected-node-id="selectedNodeId"
        :show-level="showLevel"
        @select="$emit('node-selected', $event)"
        @toggle="$emit('toggle-node', $event)"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="flex-1 flex flex-col items-center justify-center text-[hsl(var(--muted-foreground))] px-4">
      <div class="text-4xl mb-2">🌳</div>
      <div class="text-sm text-center">Nessuna struttura WBS disponibile</div>
    </div>

    <!-- Footer Actions -->
    <div v-if="selectedNodeId" class="px-3 py-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
      <UButton
        color="gray"
        variant="ghost"
        size="xs"
        block
        @click="$emit('clear-selection')"
      >
        Pulisci selezione
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WbsNode } from '~/types/wbs';

withDefaults(
  defineProps<{
    nodes: WbsNode[];
    loading?: boolean;
    expandedNodes: Set<string>;
    selectedNodeId?: string | null;
    showLevel?: boolean;
  }>(),
  {
    loading: false,
    selectedNodeId: null,
    showLevel: false,
  }
);

defineEmits<{
  'node-selected': [node: WbsNode];
  'toggle-node': [nodeId: string];
  'expand-all': [];
  'collapse-all': [];
  'clear-selection': [];
}>();
</script>
