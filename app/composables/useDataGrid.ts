import { ref, type Ref } from 'vue'
import type { DataGridConfig } from '~/types/data-grid'

/**
 * Core composable for AG Grid state management
 * Provides gridApi reference and ready state
 */
export function useDataGrid(_config: DataGridConfig) {
    const gridApi = ref<any>(null)
    const gridReady = ref(false)

    const onGridReady = (params: any) => {
        gridApi.value = params.api
        gridReady.value = true
    }

    return {
        gridApi,
        gridReady,
        onGridReady,
    }
}
