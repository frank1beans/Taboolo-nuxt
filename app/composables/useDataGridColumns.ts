import type { ColumnFilterOperator, DataGridColumn } from '~/types/data-grid';
import { matchesOperator } from '~/utils/columnFilter';

export function useDataGridColumns() {
  const mapAgOptionToOperator = (filterOption: string): ColumnFilterOperator => {
    switch (filterOption) {
      case 'startsWith':
        return 'starts_with';
      case 'equals':
        return 'equals';
      case 'notContains':
        return 'not_contains';
      case 'blank':
        return 'is_empty';
      case 'notBlank':
        return 'is_not_empty';
      default:
        return 'contains';
    }
  };

  const createColumnDefs = (columns: DataGridColumn[], rowData: any[] = []) => {
    return columns.map((col) => {
      const filterSetting = col.filter ?? 'agTextColumnFilter';
      const colDef: any = {
        colId: col.colId || col.field,
        field: col.field,
        headerName: col.headerName,
        flex: col.flex,
        minWidth: col.minWidth,
        maxWidth: col.maxWidth,
        width: col.width,
        pinned: col.pinned,
        lockPosition: col.lockPosition,
        suppressSizeToFit: col.suppressSizeToFit ?? false,
        filter: filterSetting,
        floatingFilter: col.floatingFilter ?? false,
        suppressMenu: col.suppressMenu ?? true,
        suppressHeaderMenuButton: col.suppressHeaderMenuButton ?? true,
        sortable: col.sortable ?? true,
        resizable: col.resizable ?? true,
        hide: col.hide ?? false,
        headerClass: col.headerClass,
        cellClass: col.cellClass,
        suppressMovableColumns: col.suppressMovableColumns,
      };

      if (filterSetting && filterSetting !== 'agNumberColumnFilter') {
        colDef.filterParams = {
          textMatcher: (params: any) => {
            const operator = mapAgOptionToOperator(params.filterOption || 'contains');
            return matchesOperator(params.value, params.filterText || '', operator);
          },
        };
      }

      if (col.valueFormatter) {
        colDef.valueFormatter = col.valueFormatter;
      }

      if (col.cellRenderer) {
        colDef.cellRenderer = col.cellRenderer;
      }

      // Add valuesGetter for filter dropdown only when filtering is enabled
      if (filterSetting !== false) {
        if (col.valuesGetter) {
          colDef.headerComponentParams = {
            valuesGetter: col.valuesGetter,
          };
        } else if (rowData.length > 0) {
          // Auto-generate valuesGetter from rowData
          colDef.headerComponentParams = {
            valuesGetter: () => {
              const getNestedValue = (obj: any, path: string) => {
                return path.split('.').reduce((acc, part) => acc && acc[part], obj);
              };

              const unique = Array.from(
                new Set(rowData.map((r) => getNestedValue(r, col.field)))
              ).filter(v => v !== undefined && v !== null);

              unique.sort((a, b) => {
                if (typeof a === 'number' && typeof b === 'number') {
                  return a - b;
                }
                return String(a).localeCompare(String(b));
              });

              return unique.map((v) => String(v));
            },
          };
        }
      }

      return colDef;
    });
  };

  const getDefaultColDef = () => ({
    sortable: true,
    resizable: true,
    flex: 1,
    minWidth: 120,
    // Keep filter for API, hide UI via CSS and props
    filter: 'agTextColumnFilter',
    floatingFilter: false,
    suppressMenu: true,
    suppressHeaderMenuButton: true,
    suppressMovableColumns: true,
    filterParams: {
      textMatcher: (params: any) => {
        const operator = mapAgOptionToOperator(params.filterOption || 'contains');
        return matchesOperator(params.value, params.filterText || '', operator);
      },
    },
  });

  return {
    createColumnDefs,
    getDefaultColDef,
  };
}
