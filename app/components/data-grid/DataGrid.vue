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
          v-if="config.enableQuickFilter !== false"
          v-model="quickFilterText"
          :placeholder="toolbarPlaceholder"
          :enable-reset="true"
          :enable-export="config.enableExport !== false"
          @apply-filter="applyQuickFilter"
          @clear-filter="clearQuickFilter"
          @export="exportToXlsx(exportFilename)"
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
          :rowSelection="rowSelection"
          :headerHeight="config.headerHeight || 48"
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
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '~/assets/css/styles/ag-grid-custom.css';

import type { DataGridConfig } from '~/types/data-grid';
import DataGridHeader from './DataGridHeader.vue';
import ColumnFilterPopover from './ColumnFilterPopover.vue';

const props = withDefaults(
  defineProps<{
    config: DataGridConfig;
    rowData?: any[];
    height?: string;
    rowSelection?: 'single' | 'multiple';
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
    rowSelection: 'single',
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

const { createColumnDefs, getDefaultColDef } = useDataGridColumns();

// Generate column definitions with valuesGetter
const columnDefs = computed(() => {
  return createColumnDefs(props.config.columns, props.rowData).map((col) => ({
    ...col,
    headerComponent: col.headerComponent !== undefined ? col.headerComponent : 'dataGridHeader',
  }));
});

const defaultColDef = computed(() => ({
  sortable: true,
  resizable: true,
  // Keep filter for API (setFilterModel), hide UI via CSS
  filter: 'agTextColumnFilter',
  floatingFilter: false,
  suppressMenu: true,
  suppressHeaderMenuButton: true,
  ...getDefaultColDef(),
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
  padding-top: 8px;
  padding-bottom: 8px;
}
</style>
