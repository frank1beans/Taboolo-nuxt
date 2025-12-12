import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WbsTreeNodeData } from '@/components/wbs/WbsTree.vue'

export interface FilterState {
  // WBS filters
  selectedWbsNodeId: string | null
  selectedWbsNode: WbsTreeNodeData | null

  // Round filters
  selectedRound: number | null

  // Company/Impresa filters
  selectedCompany: string | null

  // Discipline filters
  selectedDiscipline: string | null

  // Revision filters
  selectedRevision: string | null

  // Custom filters (key-value pairs)
  customFilters: Record<string, unknown>
}

export const useFiltersStore = defineStore('filters', () => {
  // State
  const selectedWbsNodeId = ref<string | null>(null)
  const selectedWbsNode = ref<WbsTreeNodeData | null>(null)
  const selectedRound = ref<number | null>(null)
  const selectedCompany = ref<string | null>(null)
  const selectedDiscipline = ref<string | null>(null)
  const selectedRevision = ref<string | null>(null)
  const customFilters = ref<Record<string, unknown>>({})

  // Computed
  const hasActiveFilters = computed(() => {
    return !!(
      selectedWbsNodeId.value ||
      selectedRound.value ||
      selectedCompany.value ||
      selectedDiscipline.value ||
      selectedRevision.value ||
      Object.keys(customFilters.value).length > 0
    )
  })

  const activeFiltersCount = computed(() => {
    let count = 0
    if (selectedWbsNodeId.value) count++
    if (selectedRound.value) count++
    if (selectedCompany.value) count++
    if (selectedDiscipline.value) count++
    if (selectedRevision.value) count++
    count += Object.keys(customFilters.value).length
    return count
  })

  // Actions
  const setWbsFilter = (nodeId: string | null, node: WbsTreeNodeData | null) => {
    selectedWbsNodeId.value = nodeId
    selectedWbsNode.value = node
  }

  const setRoundFilter = (round: number | null) => {
    selectedRound.value = round
  }

  const setCompanyFilter = (company: string | null) => {
    selectedCompany.value = company
  }

  const setDisciplineFilter = (discipline: string | null) => {
    selectedDiscipline.value = discipline
  }

  const setRevisionFilter = (revision: string | null) => {
    selectedRevision.value = revision
  }

  const setCustomFilter = (key: string, value: unknown) => {
    if (value === null || value === undefined) {
      delete customFilters.value[key]
    } else {
      customFilters.value[key] = value
    }
  }

  const removeCustomFilter = (key: string) => {
    delete customFilters.value[key]
  }

  const clearAllFilters = () => {
    selectedWbsNodeId.value = null
    selectedWbsNode.value = null
    selectedRound.value = null
    selectedCompany.value = null
    selectedDiscipline.value = null
    selectedRevision.value = null
    customFilters.value = {}
  }

  const clearWbsFilter = () => {
    selectedWbsNodeId.value = null
    selectedWbsNode.value = null
  }

  // Persistence (optional - save to localStorage)
  const saveToLocalStorage = (projectId: string) => {
    if (!import.meta.client) return

    const state: FilterState = {
      selectedWbsNodeId: selectedWbsNodeId.value,
      selectedWbsNode: selectedWbsNode.value,
      selectedRound: selectedRound.value,
      selectedCompany: selectedCompany.value,
      selectedDiscipline: selectedDiscipline.value,
      selectedRevision: selectedRevision.value,
      customFilters: customFilters.value,
    }

    localStorage.setItem(`filters-${projectId}`, JSON.stringify(state))
  }

  const loadFromLocalStorage = (projectId: string) => {
    if (!import.meta.client) return

    const stored = localStorage.getItem(`filters-${projectId}`)
    if (!stored) return

    try {
      const state: FilterState = JSON.parse(stored)
      selectedWbsNodeId.value = state.selectedWbsNodeId
      selectedWbsNode.value = state.selectedWbsNode
      selectedRound.value = state.selectedRound
      selectedCompany.value = state.selectedCompany
      selectedDiscipline.value = state.selectedDiscipline
      selectedRevision.value = state.selectedRevision
      customFilters.value = state.customFilters || {}
    } catch (e) {
      console.error('Failed to load filters from localStorage:', e)
    }
  }

  const clearLocalStorage = (projectId: string) => {
    if (!import.meta.client) return
    localStorage.removeItem(`filters-${projectId}`)
  }

  return {
    // State
    selectedWbsNodeId,
    selectedWbsNode,
    selectedRound,
    selectedCompany,
    selectedDiscipline,
    selectedRevision,
    customFilters,

    // Computed
    hasActiveFilters,
    activeFiltersCount,

    // Actions
    setWbsFilter,
    setRoundFilter,
    setCompanyFilter,
    setDisciplineFilter,
    setRevisionFilter,
    setCustomFilter,
    removeCustomFilter,
    clearAllFilters,
    clearWbsFilter,

    // Persistence
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage,
  }
})
