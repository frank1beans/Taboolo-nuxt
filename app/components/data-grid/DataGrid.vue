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
          :columnDefs="columnDefs"
          :rowData="rowData"
          :defaultColDef="defaultColDef"
          :components="components"
          :context="context"
          :rowSelection="rowSelectionProp"
          :headerHeight="config.headerHeight || 48"
          :groupHeaderHeight="config.groupHeaderHeight || 40"
          :rowHeight="config.rowHeight || 44"
          :floatingFiltersHeight="0"
          :suppressMenuHide="true"
          :animateRows="config.animateRows ?? true"
          :suppressCellFocus="config.suppressCellFocus ?? true"
          :domLayout="domLayout"
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
import { ref, computed, defineComponent, h } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);
import '~/assets/css/styles/ag-grid-custom.css';

import type { DataGridConfig } from '~/types/data-grid';
import DataGridHeader from './DataGridHeader.vue';
import ColumnFilterPopover from './ColumnFilterPopover.vue';
import ColumnVisibilityPopover from './ColumnVisibilityPopover.vue';

const props = withDefaults(
  defineProps<{
    config: DataGridConfig;
    rowData?: any[];
    height?: string;
    rowSelection?: 'single' | 'multiple' | 'singleRow' | 'multiRow' | { mode: 'singleRow' | 'multiRow' };
    toolbarPlaceholder?: string;
    emptyStateTitle?: string;
    emptyStateMessage?: string;
    showEmptyAction?: boolean;
    emptyActionLabel?: string;
    exportFilename?: string;
    loading?: boolean;
    customComponents?: Record<string, any>;
    contextExtras?: Record<string, any>;
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
  }
);

const emit = defineEmits<{
  'row-click': [row: any];
  'row-dblclick': [row: any];
  'selection-changed': [rows: any[]];
  'filter-changed': [filterModel: any];
  'sort-changed': [sortModel: any[]];
  'grid-ready': [params: any];
  'empty-action': [];
}>();

const gridWrapper = ref<HTMLElement | null>(null);
const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');
const themeClass = computed(() => (isDark.value ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'));
// Key to force re-render when theme changes
const gridKey = computed(() => `grid-${isDark.value ? 'dark' : 'light'}`);

// Use composables
const { gridApi, gridReady, onGridReady: onGridReadyBase } = useDataGrid(props.config);

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

const openColumnConfig = (trigger: HTMLElement) => {
  if (!gridApi.value) return;
  columnConfigTrigger.value = trigger;
  
  const cols = gridApi.value.getAllGridColumns();
  columnState.value = cols.map((col: any) => ({
    colId: col.getColId(),
    headerName: col.getColDef().headerName || col.getColId(),
    visible: col.isVisible(),
  }));
  showColumnConfig.value = true;
};

const toggleColumnVisibility = (colId: string, visible: boolean) => {
  if (!gridApi.value) return;
  gridApi.value.setColumnsVisible([colId], visible);
  // Update local state to reflect change immediately in UI
  const col = columnState.value.find(c => c.colId === colId);
  if (col) col.visible = visible;
};

const resetColumnVisibility = () => {
  if (!gridApi.value) return;
  gridApi.value.resetColumnState();
  // Refresh state
  openColumnConfig();
};

const { createColumnDefs, getDefaultColDef } = useDataGridColumns();

// Generate column definitions with valuesGetter and custom header
const columnDefs = computed(() => {
  return createColumnDefs(props.config.columns, props.rowData).map((col) => ({
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
  menuTabs: ['generalMenuTab', 'filterMenuTab', 'columnsMenuTab'],
  suppressHeaderMenuButton: false,
}));

// Custom header component
const DataGridHeaderComponent = defineComponent({
  name: 'DataGridHeaderComponent',
  props: ['params'],
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
  openFilterPanel: (config: any) => {
    openFilterPanel(config);
  },
  getCurrentFilter: (field: string) => getCurrentFilter(field),
  ...(props.contextExtras || {}),
}));

// Grid ready handler
const onGridReady = (params: any) => {
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
const handleRowClick = (event: any) => {
  emit('row-click', event.data);
};

const handleRowDoubleClick = (event: any) => {
  emit('row-dblclick', event.data);
};

const handleSelectionChange = () => {
  if (!gridApi.value) return;
  const selectedRows = gridApi.value.getSelectedRows();
  emit('selection-changed', selectedRows);
};

const onColumnResized = (e: any) => {
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
