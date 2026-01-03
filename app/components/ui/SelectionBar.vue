<script setup lang="ts">
import { computed } from 'vue'
import { useSelectionStore } from '~/stores/selection'
import ActionList from '~/components/actions/ActionList.vue'

const props = withDefaults(defineProps<{
  selectionKey: string
  actionIds: string[]
  labelSingular?: string
  labelPlural?: string
  showClear?: boolean
}>(), {
  labelSingular: 'Elemento',
  labelPlural: 'Elementi',
  showClear: true,
})

const selectionStore = useSelectionStore()
const selectedItems = computed(() => selectionStore.getSelection(props.selectionKey))
const selectedCount = computed(() => selectedItems.value.length)

const labelText = computed(() => {
  const count = selectedCount.value
  if (count === 1) return props.labelSingular
  return props.labelPlural
})

const clearSelection = () => {
  selectionStore.clearSelection(props.selectionKey)
}
</script>

<template>
  <div
    v-if="selectedCount > 0"
    class="mt-2 px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex items-center justify-between gap-3"
  >
    <div class="text-sm font-medium text-[hsl(var(--foreground))]">
      {{ selectedCount }} {{ labelText }} selezionati
    </div>

    <div class="flex items-center gap-2">
      <ActionList
        layout="selection"
        :action-ids="actionIds"
        :selection-count="selectedCount"
        :show-disabled="true"
      />

      <UButton
        v-if="showClear"
        icon="i-heroicons-x-mark"
        color="neutral"
        variant="ghost"
        size="xs"
        title="Annulla selezione"
        @click="clearSelection"
      />
    </div>
  </div>
</template>
