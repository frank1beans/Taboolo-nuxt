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

  const getNestedValue = (obj: any, path: string | undefined) => {
    if (!path) return undefined;
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
  };

  const createColumnDefs = (columns: DataGridColumn[], rowData: any[] = []): any[] => {
    return columns.map((col) => {
      // Handle Column Groups recursively
      if (col.children && col.children.length > 0) {
        return {
          ...col,
          children: createColumnDefs(col.children, rowData),
        };
      }

      let filterSetting: any = col.filter ?? 'agTextColumnFilter';

      if (filterSetting === true) filterSetting = 'agTextColumnFilter';
      if (filterSetting === 'number') filterSetting = 'agNumberColumnFilter';

      const shouldTreatAsNumeric = (() => {
        if (!col.field) return false;
        if (col.filterType === 'number' || filterSetting === 'agNumberColumnFilter') return true;
        for (const row of rowData) {
          const val = getNestedValue(row, col.field);
          if (val !== null && val !== undefined) {
            return typeof val === 'number';
          }
        }
        return false;
      })();

      if (
        shouldTreatAsNumeric &&
        (col.filter === undefined || col.filter === true || col.filter === 'agTextColumnFilter')
      ) {
        filterSetting = 'agNumberColumnFilter';
      }

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
        suppressHeaderMenuButton: col.suppressHeaderMenuButton ?? false,
        sortable: col.sortable ?? true,
        resizable: col.resizable ?? true,
        hide: col.hide ?? false,
        headerClass: col.headerClass,
        cellClass: col.cellClass,
        suppressMovable: col.suppressMovable ?? col.suppressMovableColumns,
        headerComponent: col.headerComponent ?? (!col.children ? 'dataGridHeader' : undefined),
        headerComponentParams: col.headerComponentParams,
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

      if (col.cellStyle) {
        colDef.cellStyle = col.cellStyle;
      }

      if (col.valueGetter) {
        colDef.valueGetter = col.valueGetter;
      }

      // Add valuesGetter for filter dropdown only when filtering is enabled
      // Only set valuesGetter if field is present
      if (filterSetting !== false && col.field) {
        if (col.valuesGetter) {
          colDef.headerComponentParams = {
            valuesGetter: col.valuesGetter,
          };
        } else if (rowData.length > 0) {
          // Auto-generate valuesGetter from rowData
          colDef.headerComponentParams = {
            valuesGetter: () => {
              const unique = Array.from(
                new Set(rowData.map((r) => {
                  if (col.valueGetter) {
                    // Construct minimal params object if valueGetter expects it
                    try {
                      // Safe to cast or assume basic usage for value extraction
                      return col.valueGetter({ data: r } as any);
                    } catch (e) {
                      return undefined;
                    }
                  }
                  return getNestedValue(r, col.field)
                }))
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
    menuTabs: [],
    suppressHeaderMenuButton: true,
    suppressMovable: true,
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
