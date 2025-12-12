import { computed } from 'vue'
import { useFiltersStore } from '@/stores/filters'
import type { WbsTreeNodeData } from '@/components/wbs/WbsTree.vue'

/**
 * Composable to filter data based on global filters store
 *
 * Usage:
 * ```ts
 * const { filteredData } = useFilteredData(rawData, {
 *   wbsField: 'wbs_code',
 *   roundField: 'round_number',
 *   companyField: 'company'
 * })
 * ```
 */
export interface UseFilteredDataOptions {
  wbsField?: string
  roundField?: string
  companyField?: string
  disciplineField?: string
  revisionField?: string
  customFilterFn?: (item: any, filters: ReturnType<typeof useFiltersStore>) => boolean
}

export const useFilteredData = <T extends Record<string, any>>(
  data: Ref<T[] | undefined> | ComputedRef<T[] | undefined>,
  options: UseFilteredDataOptions = {}
) => {
  const filtersStore = useFiltersStore()

  const {
    wbsField = 'wbs_code',
    roundField = 'round_number',
    companyField = 'company',
    disciplineField = 'discipline',
    revisionField = 'revision',
    customFilterFn,
  } = options

  // Check if item matches WBS filter
  const matchesWbsFilter = (item: T): boolean => {
    if (!filtersStore.selectedWbsNode) return true

    const itemWbsCode = item[wbsField]
    if (!itemWbsCode) return false

    const selectedCode = filtersStore.selectedWbsNode.code

    // Match exact code or children (starts with parent code)
    return itemWbsCode === selectedCode || itemWbsCode.startsWith(selectedCode + '.')
  }

  // Check if item matches round filter
  const matchesRoundFilter = (item: T): boolean => {
    if (filtersStore.selectedRound === null) return true
    return item[roundField] === filtersStore.selectedRound
  }

  // Check if item matches company filter
  const matchesCompanyFilter = (item: T): boolean => {
    if (!filtersStore.selectedCompany) return true
    return item[companyField] === filtersStore.selectedCompany
  }

  // Check if item matches discipline filter
  const matchesDisciplineFilter = (item: T): boolean => {
    if (!filtersStore.selectedDiscipline) return true
    return item[disciplineField] === filtersStore.selectedDiscipline
  }

  // Check if item matches revision filter
  const matchesRevisionFilter = (item: T): boolean => {
    if (!filtersStore.selectedRevision) return true
    return item[revisionField] === filtersStore.selectedRevision
  }

  const filteredData = computed(() => {
    const rawData = unref(data)
    if (!rawData || rawData.length === 0) return []

    return rawData.filter((item) => {
      // Apply all standard filters
      if (!matchesWbsFilter(item)) return false
      if (!matchesRoundFilter(item)) return false
      if (!matchesCompanyFilter(item)) return false
      if (!matchesDisciplineFilter(item)) return false
      if (!matchesRevisionFilter(item)) return false

      // Apply custom filter function if provided
      if (customFilterFn && !customFilterFn(item, filtersStore)) return false

      return true
    })
  })

  const filteredCount = computed(() => filteredData.value.length)
  const totalCount = computed(() => unref(data)?.length || 0)
  const isFiltered = computed(() => filtersStore.hasActiveFilters)

  return {
    filteredData,
    filteredCount,
    totalCount,
    isFiltered,
    filtersStore,
  }
}
