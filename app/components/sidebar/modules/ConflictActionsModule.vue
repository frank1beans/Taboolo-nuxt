<script setup lang="ts">
import SidebarActionsModule from '~/components/sidebar/modules/SidebarActionsModule.vue'

const props = defineProps<{
  selectedCount: number
}>()

const actionIds = [
  'conflicts.batchResolve',
  'conflicts.batchIgnore',
  'conflicts.batchApplyPrices',
]
</script>

<template>
  <SidebarActionsModule
    title="Azioni rapide"
    icon="i-heroicons-bolt"
    :action-ids="actionIds"
    :selected-count="props.selectedCount"
    empty-message="Seleziona uno o piu conflitti per attivare le azioni rapide"
  />
</template>
