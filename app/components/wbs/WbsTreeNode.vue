<template>
  <li>
    <div class="flex items-center gap-2 py-1">
      <span class="font-mono text-xs rounded bg-muted px-2 py-0.5">{{ node.code }}</span>
      <span class="text-sm">{{ node.description || '—' }}</span>
      <span class="text-[11px] text-muted-foreground uppercase">{{ node.category }}</span>
    </div>
    <ul v-if="node.children?.length" class="ml-4 border-l border-border pl-3">
      <WbsTreeNode v-for="child in node.children" :key="child._id" :node="child" />
    </ul>
  </li>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { WbsTreeNodeData } from './WbsTree.vue'

defineProps({
  node: {
    type: Object as PropType<WbsTreeNodeData>,
    required: true,
  },
})
</script>
