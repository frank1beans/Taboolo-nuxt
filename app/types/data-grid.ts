export interface DataGridColumn {
  colId?: string;
  field?: string;
  headerName: string;
  flex?: number;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  filter?: boolean | 'agTextColumnFilter' | 'agNumberColumnFilter' | string;
  floatingFilter?: boolean;
  sortable?: boolean;
  valueFormatter?: (params: any) => string;
  cellRenderer?: string | Record<string, unknown> | ((params: any) => any);
  cellRendererParams?: any;
  cellClass?: string | string[] | ((params: any) => string | string[]);
  headerClass?: string;
  headerComponent?: string | Record<string, any> | ((params: any) => any);
  headerComponentParams?: Record<string, unknown>;
  hide?: boolean;
  valueGetter?: (params: { data?: unknown }) => unknown;
  valuesGetter?: () => Array<string | number>;
  pinned?: 'left' | 'right' | boolean | null;
  lockPosition?: boolean | 'left' | 'right';
  suppressHeaderMenuButton?: boolean;
  suppressHeaderContextMenu?: boolean;
  resizable?: boolean;
  suppressSizeToFit?: boolean;
  suppressMovable?: boolean;
  suppressMovableColumns?: boolean;
  cellStyle?: Record<string, unknown> | ((params: { value: unknown; data?: unknown }) => Record<string, unknown>);
  /**
   * Column Group Children
   */
  children?: DataGridColumn[];
  /**
   * Hint for the grid/filter UI to treat the column as numeric.
   * If set to "number" the column will use AG Grid number filter and show numeric operators.
   */
  filterType?: 'text' | 'number' | 'date';
  filterMode?: 'single' | 'multi';
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
  | 'in_range'
  | 'in';

export interface ColumnFilter {
  columnKey: string;
  operator: ColumnFilterOperator;
  value?: string | string[] | null;
}

export interface DataGridConfig {
  columns: DataGridColumn[];
  defaultColDef?: Partial<DataGridColumn>;
  rowHeight?: number;
  headerHeight?: number;
  groupHeaderHeight?: number;
  animateRows?: boolean;
  suppressCellFocus?: boolean;
  pagination?: PaginationConfig;
  enableQuickFilter?: boolean;
  enableExport?: boolean;
  enableColumnToggle?: boolean;
  rowClassRules?: Record<string, (params: { data?: unknown }) => boolean> | {
    [cssClassName: string]: string | ((params: { data?: unknown }) => boolean);
  };
  getRowClass?: (params: { data?: unknown }) => string | string[];
  enableRowSelection?: boolean;
  selectionMode?: 'single' | 'multiple' | 'singleRow' | 'multiRow';
}

export interface DataGridRowAction<T = Record<string, unknown>> {
  id: string;
  label: string;
  icon?: string;
  tooltip?: string;
  color?: 'red' | 'gray' | 'white' | 'primary' | 'black';
  primary?: boolean;
  visible?: boolean | ((row?: T) => boolean);
  disabled?: boolean | ((row?: T) => boolean);
  onClick?: (row?: T) => void;
}

export type DataGridRowActions<T = Record<string, unknown>> =
  | DataGridRowAction<T>[]
  | ((row?: T) => DataGridRowAction<T>[]);

export interface PaginationConfig {
  mode: 'server' | 'client';
  pageSize: number;
  pageSizeOptions?: number[];
}

export interface DataGridFetchParams {
  page: number;
  pageSize: number;
  sortModel?: unknown[];
  filterModel?: Record<string, unknown>;
  quickFilter?: string;
}

export interface DataGridFetchResponse<T = unknown> {
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
  /** Type of filter: 'wbs' for hierarchy filters, 'column' for table column filters */
  filterType?: 'wbs' | 'column';
}

export interface FilterPanelState {
  field: string;
  label: string;
  options: string[];
  multiSelect?: boolean;
  triggerRect?: DOMRect;
  triggerEl?: HTMLElement | null;
  currentFilter?: ColumnFilter | null;
  filterType?: 'text' | 'number' | 'date' | 'set';
}

export interface FilterPanelConfig {
  field: string;
  label: string;
  options: string[];
  multiSelect?: boolean;
  triggerEl?: HTMLElement | null;
  filterType?: 'text' | 'number' | 'date' | 'set';
}
