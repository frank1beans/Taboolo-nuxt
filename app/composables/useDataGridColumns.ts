import type { DataGridColumn } from '~/types/data-grid';

export function useDataGridColumns() {
  const createColumnDefs = (columns: DataGridColumn[], rowData: any[] = []) => {
    return columns.map((col) => {
      const colDef: any = {
        field: col.field,
        headerName: col.headerName,
        flex: col.flex,
        minWidth: col.minWidth,
        maxWidth: col.maxWidth,
        filter: col.filter ?? 'agTextColumnFilter',
        sortable: col.sortable ?? true,
        hide: col.hide ?? false,
      };

      if (col.valueFormatter) {
        colDef.valueFormatter = col.valueFormatter;
      }

      if (col.cellRenderer) {
        colDef.cellRenderer = col.cellRenderer;
      }

      // Add valuesGetter for filter dropdown
      if (col.valuesGetter) {
        colDef.headerComponentParams = {
          valuesGetter: col.valuesGetter,
        };
      } else if (rowData.length > 0) {
        // Auto-generate valuesGetter from rowData
        colDef.headerComponentParams = {
          valuesGetter: () => {
            const values = Array.from(
              new Set(rowData.map((r) => r[col.field] as string | number))
            ).map((v) => String(v));
            return values;
          },
        };
      }

      return colDef;
    });
  };

  const getDefaultColDef = () => ({
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    minWidth: 120,
    suppressMenu: true,
    suppressMovableColumns: true,
  });

  return {
    createColumnDefs,
    getDefaultColDef,
  };
}
