import { ref, type Ref } from 'vue';
import type { DataGridConfig } from '~/types/data-grid';

export function useDataGrid(config: DataGridConfig) {
  const gridApi = ref<any>(null);
  const gridReady = ref(false);

  const onGridReady = (params: any) => {
    gridApi.value = params.api;
    gridReady.value = true;
  };

  const refreshData = () => {
    if (!gridApi.value) return;
    gridApi.value.refreshCells();
  };

  const getSelectedRows = () => {
    if (!gridApi.value) return [];
    return gridApi.value.getSelectedRows();
  };

  const sizeColumnsToFit = () => {
    if (!gridApi.value) return;
    gridApi.value.sizeColumnsToFit();
  };

  const autoSizeAllColumns = () => {
    if (!gridApi.value) return;
    const allColumnIds = gridApi.value.getAllGridColumns().map((col: any) => col.getId());
    gridApi.value.autoSizeColumns(allColumnIds);
  };

  return {
    gridApi,
    gridReady,
    onGridReady,
    refreshData,
    getSelectedRows,
    sizeColumnsToFit,
    autoSizeAllColumns,
  };
}
