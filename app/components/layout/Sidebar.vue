<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import type { TreeNode } from '~/composables/useProjectTree'

const props = defineProps<{
  nodes: TreeNode[]
  isCollapsed: boolean
  width: number
  minWidth: number
  maxWidth: number
  collapsedWidth: number
  activeNodeId?: string
  hasProject: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'resize', width: number): void
  (e: 'toggle'): void
}>()
</script>

<template>
  <AppSidebar v-bind="props" @toggle="emit('toggle')" @resize="emit('resize', $event)" />
</template>
