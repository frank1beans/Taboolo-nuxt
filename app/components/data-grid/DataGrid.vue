<template>
  <ClientOnly>
    <div
      ref="gridWrapper"
      class="w-full relative flex flex-col rounded-xl border overflow-hidden border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]"
      :style="{ height }"
    >
      <!-- Loading State -->
      <DataGridLoadingSkeleton v-if="loading" />

      <!-- Main Grid -->
      <template v-else-if="rowData.length > 0">
        <!-- Toolbar -->
        <DataGridToolbar
          v-model="quickFilterText"
          :placeholder="toolbarPlaceholder"
          :enable-reset="true"
          :enable-export="config.enableExport !== false"
          :enable-column-toggle="config.enableColumnToggle !== false"
          @apply-filter="applyQuickFilter"
          @clear-filter="clearQuickFilter"
          @export="exportToXlsx(exportFilename)"
          @toggle-columns="openColumnConfig"
        />

        <!-- AG Grid -->
        <AgGridVue
          :key="gridKey"
          :class="['flex-1 w-full', themeClass]"
          theme="legacy"
          :column-defs="columnDefs"
          :row-data="rowData"
          :default-col-def="defaultColDef"
          :components="components"
          :context="context"
          :row-selection="rowSelectionProp"
          :header-height="config.headerHeight || 48"
          :group-header-height="config.groupHeaderHeight || 40"
          :row-height="config.rowHeight || 44"
          :floating-filters-height="0"
          :suppress-menu-hide="true"
          :animate-rows="config.animateRows ?? true"
          :suppress-cell-focus="config.suppressCellFocus ?? true"
          :dom-layout="domLayout"
          @grid-ready="onGridReady"
          @row-clicked="handleRowClick"
          @row-double-clicked="handleRowDoubleClick"
          @selection-changed="handleSelectionChange"
          @column-resized="onColumnResized"
        />

        <!-- Filter Chips -->
        <DataGridFilterChips
          :filters="activeFilters"
          @remove="removeFilter"
          @clear-all="clearAllFilters"
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
        @action="$emit('empty-action')"
      />
    </div>

    <template #fallback>
      <div
        class="w-full border border-[hsl(var(--border))] rounded-md flex items-center justify-center text-sm text-[hsl(var(--muted-foreground))]"
        :style="{ height }"
      >
        Caricamento tabella...
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, computed, defineComponent, h, type PropType } from 'vue';
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
} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '~/assets/css/styles/ag-grid-custom.css';

import type { DataGridConfig, FilterPanelConfig } from '~/types/data-grid';
import DataGridHeader from './DataGridHeader.vue';
import ColumnFilterPopover from './ColumnFilterPopover.vue';
import ColumnVisibilityPopover from './ColumnVisibilityPopover.vue';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

type RowData = Record<string, unknown>;

const props = withDefaults(
  defineProps<{
    config: DataGridConfig;
    rowData?: RowData[];
    height?: string;
    rowSelection?: 'single' | 'multiple' | 'singleRow' | 'multiRow' | { mode: 'singleRow' | 'multiRow' };
    toolbarPlaceholder?: string;
    emptyStateTitle?: string;
    emptyStateMessage?: string;
    showEmptyAction?: boolean;
    emptyActionLabel?: string;
    exportFilename?: string;
    loading?: boolean;
    customComponents?: Record<string, unknown>;
    contextExtras?: Record<string, unknown>;
    domLayout?: 'normal' | 'autoHeight' | 'print';
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
    exportFilename: 'export',
    loading: false,
    customComponents: () => ({}),
    contextExtras: () => ({}),
    domLayout: 'normal',
  }
);

const emit = defineEmits<{
  'row-click': [row: RowData];
  'row-dblclick': [row: RowData];
  'selection-changed': [rows: RowData[]];
  'filter-changed': [filterModel: Record<string, unknown>];
  'sort-changed': [sortModel: unknown[]];
  'grid-ready': [params: GridReadyEvent];
  'empty-action': [];
}>();

const gridWrapper = ref<HTMLElement | null>(null);
const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');
const themeClass = computed(() => (isDark.value ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'));
// Key to force re-render when theme changes
const gridKey = computed(() => `grid-${isDark.value ? 'dark' : 'light'}`);

// Use composables
const { gridApi, onGridReady: onGridReadyBase } = useDataGrid(props.config);

const rowSelectionProp = computed(() => {
  if (typeof props.rowSelection === 'string') {
    if (props.rowSelection === 'single' || props.rowSelection === 'singleRow') {
      return { mode: 'singleRow' as const, checkboxes: false, headers: false }
    }
    if (props.rowSelection === 'multiple' || props.rowSelection === 'multiRow') {
      return { mode: 'multiRow' as const, checkboxes: false, headers: false }
    }
  }
  if (props.rowSelection && typeof props.rowSelection === 'object') {
    return props.rowSelection
  }
  return { mode: 'singleRow' as const, checkboxes: false, headers: false }
})

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
} = useDataGridFilters(gridApi, props.config.columns);

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

// Generate column definitions with valuesGetter and custom header
const columnDefs = computed(() => {
  const defs = createColumnDefs(props.config.columns, props.rowData) as ColDef[];
  return defs.map((col) => ({
    ...col,
    headerComponent: col.headerComponent !== undefined
      ? col.headerComponent
      : (!col.children ? 'dataGridHeader' : undefined),
  }));
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
  ...(props.customComponents || {}),
}));

// Context for header components
const context = computed(() => ({
  openFilterPanel: (config: FilterPanelConfig) => {
    openFilterPanel(config);
  },
  getCurrentFilter: (field: string) => getCurrentFilter(field),
  ...(props.contextExtras || {}),
}));

// Grid ready handler
const onGridReady = (params: GridReadyEvent) => {
  onGridReadyBase(params);

  // Emit grid-ready to parent
  emit('grid-ready', params);

  // Setup event listeners for filter and sort changes
  params.api.addEventListener('filterChanged', () => {
    emit('filter-changed', params.api.getFilterModel());
  });

  params.api.addEventListener('sortChanged', () => {
    emit('sort-changed', params.api.getSortModel());
  });
};

// Event handlers
const handleRowClick = (event: RowClickedEvent<RowData>) => {
  emit('row-click', event.data as RowData);
};

const handleRowDoubleClick = (event: RowDoubleClickedEvent<RowData>) => {
  emit('row-dblclick', event.data as RowData);
};

const handleSelectionChange = (event: SelectionChangedEvent<RowData>) => {
  const selectedRows = event.api.getSelectedRows() as RowData[];
  emit('selection-changed', selectedRows);
};

const onColumnResized = (_event: ColumnResizedEvent) => {
  // if (!e?.finished || e?.source === 'sizeColumnsToFit') return;
  // e.api?.sizeColumnsToFit();
};

// Filter modal is now managed by UModal, no scroll listener needed

// Expose methods for parent components
defineExpose({
  gridApi,
  refreshData: () => gridApi.value?.refreshCells(),
  getSelectedRows: () => gridApi.value?.getSelectedRows() || [],
  clearFilters: clearAllFilters,
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
  border-bottom: 1px solid hsl(var(--border) / 0.4);
}

:deep(.ag-theme-quartz .ag-cell),
:deep(.ag-theme-quartz-dark .ag-cell) {
  padding-top: 0;
  padding-bottom: 0;
}
</style>
