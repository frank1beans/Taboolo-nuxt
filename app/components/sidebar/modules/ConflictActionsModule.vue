<script setup lang="ts">
import SidebarActionsModule from '~/components/sidebar/modules/SidebarActionsModule.vue'

const props = defineProps<{
  selectedCount: number
}>()

const actionIds = [
  'conflicts.applyAllPrices',
  'conflicts.refresh',
  'conflicts.openPending',
  'conflicts.openAddendum',
  'conflicts.batchResolve',
  'conflicts.batchIgnore',
  'conflicts.batchApplyPrices',
]

const primaryActionIds = ['conflicts.applyAllPrices']
</script>

<template>
  <SidebarActionsModule
    :action-ids="actionIds"
    :selected-count="props.selectedCount"
    :primary-action-ids="primaryActionIds"
  />
</template>
