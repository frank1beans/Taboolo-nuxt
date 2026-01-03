import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'

type SelectionMap = Record<string, unknown[]>

/**
 * Selection Store
 * - Keeps track of selected rows per grid key.
 * - Used by SelectionBar and selection-scoped actions.
 */
export const useSelectionStore = defineStore('selection', () => {
  const selections = reactive<SelectionMap>({})

  const setSelection = (key: string, rows: unknown[]) => {
    selections[key] = rows
  }

  const clearSelection = (key: string) => {
    selections[key] = []
  }

  const getSelection = (key: string) => selections[key] ?? []

  const selectionCount = (key: string) =>
    computed(() => (selections[key] ?? []).length)

  return {
    selections,
    setSelection,
    clearSelection,
    getSelection,
    selectionCount,
  }
})
