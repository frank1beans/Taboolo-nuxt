import { ref } from 'vue'
import type { GridApi, GridReadyEvent } from 'ag-grid-community'

export interface UseDataGridOptions {
  persistKey?: string
  enableExport?: boolean
}

/**
 * Composable for AG Grid state management
 * Provides common grid operations: export, column state persistence, etc.
 */
export const useDataGrid = (options: UseDataGridOptions = {}) => {
  const gridApi = ref<GridApi | null>(null)

  // Get column state from localStorage if persistKey is provided
  const getStoredColumnState = () => {
    if (!options.persistKey) return null
    if (!import.meta.client) return null

    const stored = localStorage.getItem(`grid-state-${options.persistKey}`)
    return stored ? JSON.parse(stored) : null
  }

  // Save column state to localStorage
  const saveColumnState = () => {
    if (!options.persistKey || !gridApi.value) return

    const columnState = gridApi.value.getColumnState()
    localStorage.setItem(`grid-state-${options.persistKey}`, JSON.stringify(columnState))
  }

  // Grid ready callback
  const onGridReady = (params: GridReadyEvent) => {
    gridApi.value = params.api

    // Restore column state if available
    const storedState = getStoredColumnState()
    if (storedState && gridApi.value) {
      gridApi.value.applyColumnState({ state: storedState, applyOrder: true })
    }

    // Auto-size columns on first load
    params.api.sizeColumnsToFit()
  }

  // Export to CSV (AG Grid Community)
  const exportToCsv = (fileName?: string) => {
    if (!gridApi.value) return

    gridApi.value.exportDataAsCsv({
      fileName: fileName || 'export.csv',
    })
  }

  // Refresh grid data
  const refreshGrid = () => {
    if (!gridApi.value) return
    gridApi.value.refreshCells()
  }

  // Get selected rows
  const getSelectedRows = () => {
    if (!gridApi.value) return []
    return gridApi.value.getSelectedRows()
  }

  // Clear selection
  const clearSelection = () => {
    if (!gridApi.value) return
    gridApi.value.deselectAll()
  }

  // Apply quick filter
  const setQuickFilter = (filterText: string) => {
    if (!gridApi.value) return
    gridApi.value.setGridOption('quickFilterText', filterText)
  }

  // Auto-size all columns
  const autoSizeColumns = (skipHeader = false) => {
    if (!gridApi.value) return
    gridApi.value.autoSizeAllColumns(skipHeader)
  }

  return {
    gridApi,
    onGridReady,
    exportToCsv,
    saveColumnState,
    refreshGrid,
    getSelectedRows,
    clearSelection,
    setQuickFilter,
    autoSizeColumns,
  }
}

/**
 * Note: Excel export requires AG Grid Enterprise license.
 * For community version, use exportToCsv() or the custom functions from @/lib/grid-utils:
 * - exportToExcel() - uses XLSX library
 * - exportToExcelJS() - uses ExcelJS library (more advanced formatting)
 */
