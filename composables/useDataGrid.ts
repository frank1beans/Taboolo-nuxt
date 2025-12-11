import { ref } from 'vue'
import type { GridApi, ColumnApi, GridReadyEvent } from 'ag-grid-community'

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
  const columnApi = ref<ColumnApi | null>(null)

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
    columnApi.value = params.columnApi

    // Restore column state if available
    const storedState = getStoredColumnState()
    if (storedState && columnApi.value) {
      columnApi.value.applyColumnState({ state: storedState, applyOrder: true })
    }

    // Auto-size columns on first load
    params.api.sizeColumnsToFit()
  }

  // Export to Excel
  const exportToExcel = (fileName?: string) => {
    if (!gridApi.value) return

    gridApi.value.exportDataAsExcel({
      fileName: fileName || 'export.xlsx',
      sheetName: 'Data',
    })
  }

  // Export to CSV
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
    columnApi,
    onGridReady,
    exportToExcel,
    exportToCsv,
    saveColumnState,
    refreshGrid,
    getSelectedRows,
    clearSelection,
    setQuickFilter,
    autoSizeColumns,
  }
}
