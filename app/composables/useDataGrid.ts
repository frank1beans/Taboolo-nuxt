import { ref } from 'vue'
import type { DataGridConfig } from '~/types/data-grid'
import type { GridApi, GridReadyEvent } from 'ag-grid-community'

/**
 * Core composable for AG Grid state management
 * Provides gridApi reference and ready state
 */
export function useDataGrid(_config: DataGridConfig) {
    const gridApi = ref<GridApi | null>(null)
    const gridReady = ref(false)

    const onGridReady = (params: GridReadyEvent) => {
        gridApi.value = params.api
        gridReady.value = true
    }

    return {
        gridApi,
        gridReady,
        onGridReady,
    }
}
