export interface DataGridColumn {
  field: string;
  headerName: string;
  flex?: number;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  filter?: boolean | string;
  sortable?: boolean;
  valueFormatter?: (params: any) => string;
  cellRenderer?: string | any;
  hide?: boolean;
  valuesGetter?: () => string[];
  pinned?: 'left' | 'right' | boolean | null;
  lockPosition?: boolean | 'left' | 'right';
  suppressMenu?: boolean;
  resizable?: boolean;
}

export interface DataGridConfig {
  columns: DataGridColumn[];
  defaultColDef?: any;
  rowHeight?: number;
  headerHeight?: number;
  pagination?: PaginationConfig;
  enableQuickFilter?: boolean;
  enableExport?: boolean;
  enableColumnToggle?: boolean;
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
  type: 'equals' | 'contains' | 'blank' | 'notBlank';
}

export interface FilterPanelState {
  field: string;
  label: string;
  options: string[];
  top: number;
  left: number;
  width: number;
  height: number;
  anchor: 'left' | 'right';
  active?: string;
}

export interface FilterPanelConfig {
  field: string;
  label: string;
  options: string[];
  rect: DOMRect;
}
