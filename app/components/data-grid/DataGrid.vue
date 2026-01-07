<template>
  <ClientOnly>
    <div
      ref="gridWrapper"
      class="w-full relative flex flex-col overflow-hidden"
      :class="[
        !flat ? 'surface-card' : '',
        { 'data-grid--sticky-header': stickyHeader }
      ]"
      :style="{ height }"
    >
      <!-- Loading State -->
      <DataGridLoadingSkeleton v-if="loading" />

      <!-- Main Grid -->
      <template v-else-if="showGrid">
        <!-- Toolbar -->
        <DataGridToolbar
          v-if="showToolbar"
          v-model="quickFilterText"
          :placeholder="toolbarPlaceholder"
          :enable-reset="true"
          :enable-export="config.enableExport !== false"
          :enable-column-toggle="config.enableColumnToggle !== false"
          class="mb-2"
          @apply-filter="applyQuickFilter"
          @clear-filter="clearQuickFilter"
          @export="exportToXlsx(exportFilename)"
          @toggle-columns="openColumnConfig"
        />

        <!-- ACC-Style Filter Bar - Above Grid -->
        <DataGridFilterChips
          :filters="allActiveFilters"
          @remove="handleFilterRemove"
          @clear-all="handleClearAllFilters"
        />

        <!-- AG Grid -->
        <AgGridVue
          :key="gridKey"
          :class="['flex-1 w-full min-h-0', themeClass]"
          style="min-height: 0;"
          theme="legacy"
          :column-defs="columnDefs"
          :row-data="gridRowData"
          :default-col-def="defaultColDef"
          :row-class-rules="rowClassRules"
          :get-row-class="config.getRowClass"
          :components="components"
          :context="context"
          :row-selection="rowSelectionProp"
          :selection-column-def="selectionColumnDef"
          :get-row-id="getRowIdFn"
          :header-height="config.headerHeight || 48"
          :group-header-height="config.groupHeaderHeight || 40"
          :row-height="config.rowHeight || 44"
          :floating-filters-height="0"
          :suppress-menu-hide="true"
          :animate-rows="config.animateRows ?? true"
          :suppress-cell-focus="config.suppressCellFocus ?? true"
          :dom-layout="domLayout"
          :row-model-type="rowModelType"
          v-bind="rowModelType === 'infinite' ? {
            'cache-block-size': gridCacheBlockSize,
            'max-blocks-in-cache': gridMaxBlocksInCache
          } : {}"
          :aria-label="gridAriaLabel"
          @grid-ready="onGridReady"
          @row-clicked="handleRowClick"
          @row-double-clicked="handleRowDoubleClick"
          @selection-changed="handleSelectionChange"
          @column-resized="onColumnResized"
          :pinned-bottom-row-data="pinnedBottomRowData"
        />

        <!-- Column Filter Popover -->
        <ColumnFilterPopover
          :panel="filterPanel"
          @apply-filter="applyColumnFilter"
          @close="filterPanel = null"
        />

        <!-- Column Visibility Popover -->
        <ColumnVisibilityPopover
          :open="showColumnConfig"
          :trigger="columnConfigTrigger"
          :columns="columnState"
          @close="showColumnConfig = false"
          @toggle="toggleColumnVisibility"
          @reset="resetColumnVisibility"
        />
      </template>

      <!-- Empty State -->
      <DataGridEmptyState
        v-else
        :title="emptyStateTitle"
        :message="emptyStateMessage"
        :show-action="showEmptyAction"
        :action-label="emptyActionLabel"
        :show-secondary-action="showEmptySecondaryAction"
        :secondary-action-label="emptySecondaryActionLabel"
        :secondary-icon="emptySecondaryActionIcon"
        @action="$emit('empty-action')"
        @secondary-action="$emit('empty-secondary-action')"
      />
    </div>

    <template #fallback>
      <div
        class="surface-card w-full flex items-center justify-center text-sm text-[hsl(var(--muted-foreground))]"
        :style="{ height }"
      >
        Caricamento tabella...
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, computed, defineComponent, h, onBeforeUnmount, watch, type PropType } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import {
  AllCommunityModule,
  ModuleRegistry,
  type Column,
  type ColumnResizedEvent,
  type GridApi,
  type GridReadyEvent,
  type RowClickedEvent,
  type RowDoubleClickedEvent,
  type SelectionChangedEvent,
  type ColDef,
  type RowSelectionOptions,
  type SelectionColumnDef,
} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '~/assets/css/styles/ag-grid-custom.css';

import type { DataGridConfig, DataGridRowAction, DataGridRowActions, FilterPanelConfig, ActiveFilter } from '~/types/data-grid';
import DataGridHeader from './DataGridHeader.vue';
import DataGridRowActionsCell from './DataGridRowActions.vue';
import ColumnFilterPopover from './ColumnFilterPopover.vue';
import ColumnVisibilityPopover from './ColumnVisibilityPopover.vue';
import { useSelectionStore } from '~/stores/selection';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

type RowData = Record<string, unknown>;
type ContextRowActions = {
  open?: (row?: RowData) => void;
  viewPricelist?: (row?: RowData) => void;
  viewOffer?: (row?: RowData) => void;
  resolve?: (row?: RowData) => void;
  edit?: (row?: RowData) => void;
  remove?: (row?: RowData) => void;
};

type ContextActionExtras = {
  rowActions?: ContextRowActions;
  hasAlerts?: (row?: RowData) => boolean;
  isActionVisible?: (action: string, row?: RowData) => boolean;
};

const props = withDefaults(
  defineProps<{
    config: DataGridConfig;
    rowData?: RowData[];
    height?: string;
    rowSelection?: RowSelectionOptions | 'single' | 'multiple' | 'singleRow' | 'multiRow';
    toolbarPlaceholder?: string;
    emptyStateTitle?: string;
    emptyStateMessage?: string;
    showEmptyAction?: boolean;
    emptyActionLabel?: string;
    showEmptySecondaryAction?: boolean;
    emptySecondaryActionLabel?: string;
    emptySecondaryActionIcon?: string;
    exportFilename?: string;
    loading?: boolean;
    customComponents?: Record<string, unknown>;
    contextExtras?: Record<string, unknown>;
    domLayout?: 'normal' | 'autoHeight' | 'print';
    showToolbar?: boolean;
    filterText?: string;
    rowClickable?: boolean;
    rowAriaLabel?: string;
    stickyHeader?: boolean;
    selectionKey?: string;
    fetchRows?: (params: {
      page: number;
      pageSize: number;
      sortModel?: unknown[];
      filterModel?: Record<string, unknown>;
      quickFilter?: string;
    }) => Promise<{
      data: RowData[];
      total: number;
      page: number;
      pageSize: number;
    }>;
    cacheBlockSize?: number;
    maxBlocksInCache?: number;
    enableRowSelection?: boolean;
    selectionMode?: 'single' | 'multiple';
    rowActions?: DataGridRowActions;
    getRowId?: string | ((row: RowData) => string);
    onSelectionChange?: (selectedIds: string[], selectedRows: RowData[]) => void;
    /** External filters (e.g. WBS) to display in the filter bar */
    externalFilters?: ActiveFilter[];
    /** Callback when an external filter is removed */
    onExternalFilterRemove?: (field: string) => void;
    flat?: boolean;
    pinnedBottomRowData?: RowData[];
  }>(),
  {
    rowData: () => [],
    height: '660px',
    rowSelection: 'singleRow',
    toolbarPlaceholder: 'Filtra per codice, descrizione...',
    emptyStateTitle: 'Nessun dato disponibile',
    emptyStateMessage: 'Non ci sono dati da visualizzare.',
    showEmptyAction: false,
    emptyActionLabel: 'Ricarica',
    showEmptySecondaryAction: false,
    emptySecondaryActionLabel: 'Azione',
    emptySecondaryActionIcon: 'i-heroicons-plus',
    exportFilename: 'export',
    loading: false,
    customComponents: () => ({}),
    contextExtras: () => ({}),
    domLayout: 'normal',
    showToolbar: true,
    filterText: '',
    rowClickable: false,
    rowAriaLabel: undefined,
    stickyHeader: true,
    selectionKey: undefined,
    fetchRows: undefined,
    cacheBlockSize: undefined,
    maxBlocksInCache: undefined,
    enableRowSelection: true,
    selectionMode: 'multiple',
    flat: false,
  }
);


const emit = defineEmits<{
  'row-click': [row: RowData];
  'row-dblclick': [row: RowData];
  'selection-changed': [rows: RowData[]];
  'selection-change': [selectedIds: string[], selectedRows: RowData[]];
  'filter-changed': [filterModel: Record<string, unknown>];
  'sort-changed': [sortModel: unknown[]];
  'grid-ready': [params: GridReadyEvent];
  'empty-action': [];
  'empty-secondary-action': [];
}>();

const gridWrapper = ref<HTMLElement | null>(null);
const selectionStore = useSelectionStore();
const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');
const themeClass = computed(() => (isDark.value ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'));
// Key to force re-render when theme changes
const gridKey = computed(() => `grid-${isDark.value ? 'dark' : 'light'}`);
const missingRowIdWarned = ref(false);
const clickTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

// Use composables
const { gridApi, onGridReady: onGridReadyBase } = useDataGrid(props.config);

const resolvedSelectionMode = computed<'single' | 'multiple'>(() => {
  if (props.rowSelection && typeof props.rowSelection === 'object' && 'mode' in props.rowSelection) {
    return props.rowSelection.mode === 'multiRow' ? 'multiple' : 'single';
  }
  if (typeof props.rowSelection === 'string' && props.rowSelection !== 'singleRow') {
    if (props.rowSelection === 'multiple' || props.rowSelection === 'multiRow') return 'multiple';
    if (props.rowSelection === 'single') return 'single';
  }
  return props.selectionMode;
});

const isServerSide = computed(() => typeof props.fetchRows === 'function');

const rowSelectionProp = computed<RowSelectionOptions>(() => {
  const mode = resolvedSelectionMode.value === 'multiple' ? 'multiRow' as const : 'singleRow' as const;
  const enableCheckboxes = props.enableRowSelection !== false;
  const baseOptions: RowSelectionOptions = mode === 'multiRow'
    ? {
        mode,
        enableClickSelection: false,
        checkboxes: enableCheckboxes,
        headerCheckbox: enableCheckboxes,
        selectAll: isServerSide.value ? 'currentPage' : 'filtered',
      }
    : {
        mode,
        enableClickSelection: false,
        checkboxes: enableCheckboxes,
      };

  if (props.rowSelection && typeof props.rowSelection === 'object') {
    const merged = { ...baseOptions, ...props.rowSelection, mode };
    if (!enableCheckboxes) {
      merged.checkboxes = false;
      if ('headerCheckbox' in merged) merged.headerCheckbox = false;
    }
    return merged;
  }

  return baseOptions;
});
const gridCacheBlockSize = computed(() => isServerSide.value ? (props.cacheBlockSize || props.config.pagination?.pageSize || 200) : undefined);
const gridMaxBlocksInCache = computed(() => isServerSide.value ? (props.maxBlocksInCache ?? 4) : undefined);
const rowModelType = computed(() => (isServerSide.value ? 'infinite' : undefined));
const showGrid = computed(() => isServerSide.value || props.rowData.length > 0);
const gridRowData = computed(() => (isServerSide.value ? undefined : props.rowData));
const rowClassRules = computed(() => {
  const base = props.config.rowClassRules;
  if (!props.rowClickable) return base;
  return { ...(base || {}), 'row-clickable': () => true };
});
const gridAriaLabel = computed(() => {
  if (!props.rowClickable) return undefined;
  return props.rowAriaLabel || 'Seleziona una riga per aprire il dettaglio';
});

const {
  quickFilterText,
  activeFilters,
  filterPanel,
  applyQuickFilter,
  clearQuickFilter,
  applyColumnFilter,
  removeFilter,
  clearAllFilters,
  openFilterPanel,
  getCurrentFilter,
} = useDataGridFilters(gridApi, props.config.columns, {
  serverSide: isServerSide.value,
  onQuickFilterChange: () => {
    if (isServerSide.value) {
      gridApi.value?.purgeInfiniteCache?.();
    }
  },
});

// Merge external filters (e.g. WBS) with internal column filters
const allActiveFilters = computed(() => [
  ...(props.externalFilters || []),
  ...activeFilters.value,
]);

// Handle filter removal - route to appropriate handler based on filter type
const handleFilterRemove = (field: string) => {
  const externalFilter = props.externalFilters?.find(f => f.field === field);
  if (externalFilter) {
    // External filter (e.g. WBS) - call external handler
    props.onExternalFilterRemove?.(field);
  } else {
    // Internal column filter
    removeFilter(field);
  }
};

// Handle clear all - clear both internal and external filters
const handleClearAllFilters = () => {
  clearAllFilters();
  // Clear external filters by calling handler for each
  props.externalFilters?.forEach(f => {
    props.onExternalFilterRemove?.(f.field);
  });
};

// Watch external filterText prop
watch(() => props.filterText, (newValue) => {
  if (newValue !== undefined) {
    quickFilterText.value = newValue;
    if (isServerSide.value) {
      gridApi.value?.purgeInfiniteCache?.();
    } else {
      gridApi.value?.setGridOption('quickFilterText', newValue);
    }
  }
});

const { exportToXlsx } = useDataGridExport(gridApi);

// Column Visibility State
const showColumnConfig = ref(false);
const columnConfigTrigger = ref<HTMLElement | null>(null);
const columnState = ref<Array<{ colId: string; headerName: string; visible: boolean }>>([]);

const openColumnConfig = (trigger?: HTMLElement) => {
  const api = gridApi.value as GridApi<RowData> | null;
  if (!api) return;
  columnConfigTrigger.value = trigger ?? columnConfigTrigger.value;

  const cols = api.getAllGridColumns();
  columnState.value = cols.map((col: Column) => ({
    colId: col.getColId(),
    headerName: col.getColDef().headerName || col.getColId(),
    visible: col.isVisible(),
  }));
  showColumnConfig.value = true;
};

const toggleColumnVisibility = (colId: string, visible: boolean) => {
  const api = gridApi.value as GridApi<RowData> | null;
  if (!api) return;
  api.setColumnsVisible([colId], visible);
  // Update local state to reflect change immediately in UI
  const col = columnState.value.find(c => c.colId === colId);
  if (col) col.visible = visible;
};

const resetColumnVisibility = () => {
  const api = gridApi.value as GridApi<RowData> | null;
  if (!api) return;
  api.resetColumnState();
  // Refresh state
  openColumnConfig();
};

const { createColumnDefs, getDefaultColDef } = useDataGridColumns();

const warnMissingRowId = () => {
  if (missingRowIdWarned.value) return;
  missingRowIdWarned.value = true;
  console.warn('[DataGrid] Row id missing or unstable. Provide getRowId or ensure row.id/_id exists.');
};

const resolveRowId = (row?: RowData) => {
  if (!row) return undefined;
  if (typeof props.getRowId === 'function') {
    const id = props.getRowId(row);
    if (id !== undefined && id !== null && id !== '') return String(id);
  }
  if (typeof props.getRowId === 'string') {
    const key = props.getRowId;
    const value = (row as Record<string, unknown>)[key];
    if (value !== undefined && value !== null && value !== '') return String(value);
  }
  const fallback = (row as Record<string, unknown>).id ?? (row as Record<string, unknown>)._id ?? (row as Record<string, unknown>).colId;
  if (fallback !== undefined && fallback !== null && fallback !== '') return String(fallback);
  return undefined;
};

const getRowIdFn = (params: { data?: RowData }) => {
  const id = resolveRowId(params.data);
  if (!id) warnMissingRowId();
  return id;
};

const getRowActionsFromContext = (row?: RowData): DataGridRowAction[] => {
  const extras = props.contextExtras as ContextActionExtras | undefined;
  const handlers = extras?.rowActions;
  if (!handlers) return [];

  const isVisible = (key: string) => {
    if (!extras?.isActionVisible) return true;
    return extras.isActionVisible(key, row);
  };

  const actions: DataGridRowAction[] = [];

  if (handlers.open && isVisible('open')) {
    actions.push({
      id: 'open',
      label: 'Apri',
      icon: 'i-heroicons-arrow-right-circle',
      tooltip: 'Apri dettagli',
      primary: true,
      onClick: () => handlers.open?.(row),
    });
  }
  if (handlers.viewPricelist && isVisible('viewPricelist')) {
    actions.push({
      id: 'viewPricelist',
      label: 'Vedi Listino',
      icon: 'i-heroicons-list-bullet',
      onClick: () => handlers.viewPricelist?.(row),
    });
  }
  if (handlers.viewOffer && isVisible('viewOffer')) {
    actions.push({
      id: 'viewOffer',
      label: 'Vedi Documento',
      icon: 'i-heroicons-document-text',
      onClick: () => handlers.viewOffer?.(row),
    });
  }
  if (handlers.resolve && extras?.hasAlerts?.(row) && isVisible('resolve')) {
    actions.push({
      id: 'resolve',
      label: 'Risolvi conflitti',
      icon: 'i-heroicons-wrench-screwdriver',
      color: 'primary',
      onClick: () => handlers.resolve?.(row),
    });
  }
  if (handlers.edit && isVisible('edit')) {
    actions.push({
      id: 'edit',
      label: 'Modifica',
      icon: 'i-heroicons-pencil-square',
      onClick: () => handlers.edit?.(row),
    });
  }
  if (handlers.remove && isVisible('remove')) {
    actions.push({
      id: 'remove',
      label: 'Elimina',
      icon: 'i-heroicons-trash',
      color: 'red',
      onClick: () => handlers.remove?.(row),
    });
  }

  return actions;
};

const buildDefaultOpenAction = (row?: RowData): DataGridRowAction => ({
  id: 'open',
  label: 'Apri',
  icon: 'i-heroicons-arrow-right-circle',
  tooltip: 'Apri dettagli',
  primary: true,
  onClick: () => {
    emit('row-dblclick', row as RowData);
  },
});

const normalizeRowActions = (actions: DataGridRowAction[], row?: RowData) => {
  const list = actions.map(action => ({ ...action }));
  const hasOpen = list.some(action => action.id === 'open');
  if (!hasOpen) list.unshift(buildDefaultOpenAction(row));
  if (!list.some(action => action.primary)) {
    const open = list.find(action => action.id === 'open');
    if (open) open.primary = true;
  }
  return list;
};

const getRowActions = (row?: RowData): DataGridRowAction[] => {
  let actions: DataGridRowAction[] = [];

  if (props.rowActions) {
    actions = typeof props.rowActions === 'function' ? (props.rowActions(row) || []) : props.rowActions;
  } else {
    actions = getRowActionsFromContext(row);
  }

  if (!actions.length) {
    return [buildDefaultOpenAction(row)];
  }

  return normalizeRowActions(actions, row);
};

// Generate column definitions with valuesGetter and custom header
const columnDefs = computed(() => {
  const defs = createColumnDefs(props.config.columns, props.rowData) as ColDef[];

  let existingActionsCol: ColDef | null = null;
  const cleanedDefs = defs.filter((col) => {
    if ((col as any).children) return true;

    const colId = col.colId || col.field;
    const isSelectionCol = Boolean((col as any).checkboxSelection)
      || colId === 'selection'
      || colId === '_selection'
      || col.field === '_selection';
    const isActionsCol = colId === 'actions' || col.field === 'actions';

    if (isSelectionCol) return false;
    if (isActionsCol && !existingActionsCol) {
      existingActionsCol = col;
      return false;
    }
    return true;
  });

  const mappedDefs = cleanedDefs.map((col) => ({
    ...col,
    headerComponent: col.headerComponent !== undefined
      ? col.headerComponent
      : (!(col as any).children ? 'dataGridHeader' : undefined),
  }));

  const pinnedCols: ColDef[] = [];

  const rawRenderer = existingActionsCol?.cellRenderer;
  let overflowRenderer: unknown;
  if (typeof rawRenderer === 'string') {
    overflowRenderer = props.customComponents?.[rawRenderer] || rawRenderer;
  } else if (typeof rawRenderer === 'object') {
    overflowRenderer = rawRenderer;
  }

  pinnedCols.push({
    colId: 'row-actions',
    headerName: '',
    width: 64,
    minWidth: 56,
    maxWidth: 72,
    pinned: 'right',
    lockPosition: 'right',
    suppressMovable: true,
    suppressSizeToFit: true,
    sortable: false,
    filter: false,
    resizable: false,
    suppressHeaderMenuButton: true,
    suppressHeaderContextMenu: true,
    headerClass: 'data-grid-utility-header',
    cellClass: 'data-grid-actions-cell overflow-visible flex items-center justify-center',
    cellRenderer: 'dataGridRowActions',
    cellRendererParams: {
      overflowRenderer,
    },
  });

  return [...pinnedCols, ...mappedDefs];
});

const selectionColumnDef = computed<SelectionColumnDef | undefined>(() => {
  if (props.enableRowSelection === false) return undefined;
  return {
    headerName: '',
    width: 48,
    minWidth: 44,
    maxWidth: 56,
    pinned: 'left',
    lockPosition: 'left',
    suppressMovable: true,
    suppressSizeToFit: true,
    sortable: false,
    resizable: false,
    suppressHeaderMenuButton: true,
    suppressHeaderContextMenu: true,
    headerClass: 'data-grid-utility-header data-grid-select-all-header',
    cellClass: 'data-grid-selection-cell flex items-center justify-center',
  };
});

const defaultColDef = computed(() => ({
  ...getDefaultColDef(),
  filter: 'agTextColumnFilter',
  floatingFilter: false,
  suppressHeaderMenuButton: false,
}));

// Custom header component
const DataGridHeaderComponent = defineComponent({
  name: 'DataGridHeaderComponent',
  props: {
    params: {
      type: Object as PropType<Record<string, unknown>>,
      required: true,
    },
  },
  setup(componentProps) {
    return () => h(DataGridHeader, { params: componentProps.params });
  },
});

const components = computed(() => ({
  dataGridHeader: DataGridHeaderComponent,
  dataGridRowActions: DataGridRowActionsCell,
  ...(props.customComponents || {}),
}));

// Context for header components
const context = computed(() => ({
  openFilterPanel: (config: FilterPanelConfig) => {
    openFilterPanel(config);
  },
  getCurrentFilter: (field: string) => getCurrentFilter(field),
  selectionMode: resolvedSelectionMode.value,
  getRowActions,
  ...(props.contextExtras || {}),
}));

// Grid ready handler
const buildServerDatasource = () => {
  if (!gridApi.value || !props.fetchRows) return;
  const api = gridApi.value;
  const blockSize = gridCacheBlockSize.value || 200;

  api.setGridOption('datasource', {
    getRows: async (params: {
      startRow: number;
      endRow: number;
      sortModel: unknown[];
      filterModel: Record<string, unknown>;
      successCallback: (rows: RowData[], total: number) => void;
      failCallback: () => void;
    }) => {
      try {
        const page = Math.floor(params.startRow / blockSize) + 1;
        const response = await props.fetchRows({
          page,
          pageSize: blockSize,
          sortModel: params.sortModel,
          filterModel: params.filterModel,
          quickFilter: quickFilterText.value,
        });
        params.successCallback(response.data, response.total);
      } catch (error) {
        console.error('DataGrid fetchRows failed:', error);
        params.failCallback();
      }
    },
  });
};

const onGridReady = (params: GridReadyEvent) => {
  onGridReadyBase(params);

  // Emit grid-ready to parent
  emit('grid-ready', params);

  if (isServerSide.value) {
    buildServerDatasource();
  }

  // Setup event listeners for filter and sort changes
  params.api.addEventListener('filterChanged', () => {
    emit('filter-changed', params.api.getFilterModel());
    if (isServerSide.value) {
      params.api.refreshInfiniteCache?.();
    }
  });

  params.api.addEventListener('sortChanged', () => {
    // AG Grid v31+: getSortModel is deprecated/removed. Use getColumnState.
    const sortState = params.api.getColumnState()
        .filter(s => s.sort)
        .map(s => ({ colId: s.colId, sort: s.sort, sortIndex: s.sortIndex }));
    emit('sort-changed', sortState);
    if (isServerSide.value) {
      params.api.refreshInfiniteCache?.();
    }
  });
};

// Event handlers
const handleRowClick = (event: RowClickedEvent<RowData>) => {
  const domEvent = event.event as Event | undefined;
  if (domEvent instanceof Event) {
    const target = domEvent.target as HTMLElement | null;
    if (target?.closest('button, a, [role="button"], input, select, textarea, [data-stop-row-click], .ag-selection-checkbox, .data-grid-row-actions')) {
      return;
    }
  }

  // Clear any existing timeout to handle rapid clicks safely (though standard dblclick handles the cancellation)
  if (clickTimeout.value) {
    clearTimeout(clickTimeout.value);
    clickTimeout.value = null;
  }

  // Delay selection logic to allow double-click detection
  clickTimeout.value = setTimeout(() => {
    // Handle selection toggle manually (accumulative)
    if (props.enableRowSelection !== false && resolvedSelectionMode.value === 'multiple' && event.node) {
      event.node.setSelected(!event.node.isSelected(), false);
    } else if (props.enableRowSelection !== false && resolvedSelectionMode.value === 'single' && event.node) {
      const wasSelected = event.node.isSelected();
      if (wasSelected) {
         event.node.setSelected(false);
      } else {
         event.node.setSelected(true, true); 
      }
    }
    
    // Emit click event (delayed)
    emit('row-click', event.data as RowData);
    
    clickTimeout.value = null;
  }, 250); // 250ms delay for double-click detection
};

const handleRowDoubleClick = (event: RowDoubleClickedEvent<RowData>) => {
  // Cancel pending single click selection
  if (clickTimeout.value) {
    clearTimeout(clickTimeout.value);
    clickTimeout.value = null;
  }
  emit('row-dblclick', event.data as RowData);
};

const handleSelectionChange = (event: SelectionChangedEvent<RowData>) => {
  const selectedNodes = event.api.getSelectedNodes();
  const selectedRows = selectedNodes.map(node => node.data as RowData).filter(Boolean);
  const selectedIds = selectedNodes.map((node) => {
    const row = node.data as RowData | undefined;
    const id = resolveRowId(row) ?? (node.id !== undefined && node.id !== null ? String(node.id) : undefined);
    if (!id) {
      warnMissingRowId();
      return 'row-unknown';
    }
    if (!props.getRowId && !(row && (row as Record<string, unknown>).id) && !(row && (row as Record<string, unknown>)._id)) {
      warnMissingRowId();
    }
    return id;
  });
  
  emit('selection-changed', selectedRows);
  emit('selection-change', selectedIds, selectedRows);
  props.onSelectionChange?.(selectedIds, selectedRows);
  
  if (props.selectionKey) {
    selectionStore.setSelection(props.selectionKey, selectedRows);
  }
};

watch(
  () => (props.selectionKey ? selectionStore.getSelection(props.selectionKey).length : 0),
  (count) => {
    if (props.selectionKey && count === 0) {
      gridApi.value?.deselectAll?.();
    }
  },
);

const onColumnResized = (_event: ColumnResizedEvent) => {
  // if (!e?.finished || e?.source === 'sizeColumnsToFit') return;
  // e.api?.sizeColumnsToFit();
};

// Filter modal is now managed by UModal, no scroll listener needed

onBeforeUnmount(() => {
  if (props.selectionKey) {
    selectionStore.clearSelection(props.selectionKey);
  }
});

// Expose methods for parent components
defineExpose({
  gridApi,
  refreshData: () => gridApi.value?.refreshCells(),
  getSelectedRows: () => gridApi.value?.getSelectedRows() || [],
  clearFilters: clearAllFilters,
  openColumnConfig, // Exposed for external toolbar
});
</script>

<style scoped>
:deep(.ag-theme-quartz),
:deep(.ag-theme-quartz-dark) {
  font-family: var(--font-sans);
}

:deep(.ag-theme-quartz .ag-root-wrapper),
:deep(.ag-theme-quartz-dark .ag-root-wrapper) {
  border: none;
}

:deep(.ag-theme-quartz .ag-header),
:deep(.ag-theme-quartz-dark .ag-header) {
  border-bottom: none;
}

:deep(.ag-theme-quartz .ag-cell),
:deep(.ag-theme-quartz-dark .ag-cell) {
  padding-top: 0;
  padding-bottom: 0;
}

:deep(.ag-cell.data-grid-selection-cell),
:deep(.ag-cell.data-grid-actions-cell) {
  padding-left: 0;
  padding-right: 0;
  justify-content: center;
}

:deep(.data-grid-utility-header .ag-header-cell-label) {
  justify-content: center;
}

:deep(.data-grid-select-all-header .ag-header-cell-label) {
  align-items: center;
  padding-top: 0;
}

:deep(.data-grid-select-all-header .ag-header-select-all) {
  align-self: center;
}

:deep(.data-grid--sticky-header .ag-header) {
  position: sticky;
  top: 0;
  z-index: 2;
  background: hsl(var(--background));
}

:deep(.ag-row.row-clickable) {
  cursor: pointer;
}

:deep(.ag-row.row-clickable:hover .ag-cell) {
  background-color: hsl(var(--muted)/0.2);
}
</style>
