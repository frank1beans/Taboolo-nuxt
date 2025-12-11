<template>
  <ul class="space-y-1">
    <WbsTreeNode v-for="node in nodes" :key="node._id" :node="node" />
  </ul>
</template>

<script setup lang="ts">
import WbsTreeNode from './WbsTreeNode.vue'
import type { PropType } from 'vue'

export interface WbsTreeNodeData {
  _id: string
  code: string
  description?: string | null
  level: number
  category?: string | null
  type?: string | null
  children: WbsTreeNodeData[]
}

defineProps({
  nodes: {
    type: Array as PropType<WbsTreeNodeData[]>,
    default: () => [],
  },
})
</script>
