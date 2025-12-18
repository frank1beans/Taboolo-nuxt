export interface DataGridColumn {
  colId?: string;
  field?: string;
  headerName: string;
  flex?: number;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  filter?: boolean | string;
  floatingFilter?: boolean;
  sortable?: boolean;
  valueFormatter?: (params: any) => string;
  cellRenderer?: string | any;
  cellClass?: string;
  headerClass?: string;
  headerComponent?: string | any;
  hide?: boolean;
  valueGetter?: (params: any) => any; // AG Grid Standard
  valuesGetter?: () => string[];
  pinned?: 'left' | 'right' | boolean | null;
  lockPosition?: boolean | 'left' | 'right';
  suppressHeaderMenuButton?: boolean;
  suppressMenu?: boolean;
  resizable?: boolean;
  suppressSizeToFit?: boolean;
  suppressMovable?: boolean;
  suppressMovableColumns?: boolean;
  /**
   * Hint for the grid/filter UI to treat the column as numeric.
  cellStyle?: any;
  /**
   * Column Group Children
   */
  children?: DataGridColumn[];
  /**
   * Hint for the grid/filter UI to treat the column as numeric.
   * If set to "number" the column will use AG Grid number filter and show numeric operators.
   */
  filterType?: 'text' | 'number' | 'date';
}

export type ColumnFilterOperator =
  | 'contains'
  | 'starts_with'
  | 'equals'
  | 'not_contains'
  | 'is_empty'
  | 'is_not_empty'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'not_equals'
  | 'in_range';

export interface ColumnFilter {
  columnKey: string;
  operator: ColumnFilterOperator;
  value?: string | null;
}

export interface DataGridConfig {
  columns: DataGridColumn[];
  defaultColDef?: any;
  rowHeight?: number;
  headerHeight?: number;
  groupHeaderHeight?: number;
  animateRows?: boolean;
  suppressCellFocus?: boolean;
  pagination?: PaginationConfig;
  enableQuickFilter?: boolean;
  enableExport?: boolean;
  enableColumnToggle?: boolean;
  rowClassRules?: Record<string, (params: any) => boolean> | { [cssClassName: string]: string | ((params: any) => boolean) };
  getRowClass?: (params: any) => string | string[];
}

export interface PaginationConfig {
  mode: 'server' | 'client';
  pageSize: number;
  pageSizeOptions?: number[];
}

export interface DataGridFetchParams {
  page: number;
  pageSize: number;
  sortModel?: any[];
  filterModel?: any;
  quickFilter?: string;
}

export interface DataGridFetchResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ActiveFilter {
  field: string;
  label: string;
  value: string;
  operator: ColumnFilterOperator;
}

export interface FilterPanelState {
  field: string;
  label: string;
  options: string[];
  triggerRect?: DOMRect;
  triggerEl?: HTMLElement | null;
  currentFilter?: ColumnFilter | null;
  filterType?: 'text' | 'number' | 'date';
}

export interface FilterPanelConfig {
  field: string;
  label: string;
  options: string[];
  triggerEl?: HTMLElement | null;
  filterType?: 'text' | 'number' | 'date';
}
