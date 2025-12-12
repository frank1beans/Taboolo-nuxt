<template>
  <ClientOnly>
    <div
      ref="gridWrapper"
      class="ag-theme-quartz w-full border border-slate-200 rounded-md relative flex flex-col"
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
          class="flex-1 w-full"
          :columnDefs="columnDefs"
          :rowData="rowData"
          :defaultColDef="defaultColDef"
          :components="components"
          :context="context"
          :rowSelection="rowSelection"
          :headerHeight="config.headerHeight || 64"
          :rowHeight="config.rowHeight"
          @grid-ready="onGridReady"
          @row-clicked="handleRowClick"
          @row-double-clicked="handleRowDoubleClick"
          @selection-changed="handleSelectionChange"
        />

        <!-- Filter Chips -->
        <DataGridFilterChips
          :filters="activeFilters"
          @remove="removeFilter"
          @clear-all="clearAllFilters"
        />

        <!-- Filter Panel -->
        <DataGridFilterPanel
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
        class="w-full border border-slate-200 rounded-md flex items-center justify-center text-sm text-slate-500"
        :style="{ height }"
      >
        Caricamento tabella...
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineComponent, h } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import type { DataGridConfig } from '~/types/data-grid';
import DataGridHeader from './DataGridHeader.vue';

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
  'empty-action': [];
}>();

const gridWrapper = ref<HTMLElement | null>(null);

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
} = useDataGridFilters(gridApi, props.config.columns);

const { exportToXlsx } = useDataGridExport(gridApi);

const { createColumnDefs, getDefaultColDef } = useDataGridColumns();

// Generate column definitions with valuesGetter
const columnDefs = computed(() => {
  return createColumnDefs(props.config.columns, props.rowData).map((col) => ({
    ...col,
    headerComponent: 'dataGridHeader',
  }));
});

const defaultColDef = computed(() => ({
  ...getDefaultColDef(),
  ...props.config.defaultColDef,
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
    const containerRect = gridWrapper.value?.getBoundingClientRect();
    openFilterPanel(config, containerRect);
  },
  ...(props.contextExtras || {}),
}));

// Grid ready handler
const onGridReady = (params: any) => {
  onGridReadyBase(params);

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

// Close filter panel on scroll
onMounted(() => {
  window.addEventListener('scroll', () => {
    filterPanel.value = null;
  });
});

// Expose methods for parent components
defineExpose({
  gridApi,
  refreshData: () => gridApi.value?.refreshCells(),
  getSelectedRows: () => gridApi.value?.getSelectedRows() || [],
  clearFilters: clearAllFilters,
});
</script>

<style scoped>
.ag-theme-quartz .ag-row {
  position: relative;
  border-bottom: none;
}

.ag-theme-quartz .ag-center-cols-container {
  min-width: 100% !important;
}

.ag-theme-quartz .ag-body-viewport {
  overflow-x: hidden !important;
}

.ag-theme-quartz .ag-row::after {
  content: '';
  position: absolute;
  inset: 0 0 -1px 0;
  border-bottom: 1px solid #e2e8f0;
  pointer-events: none;
}

.ag-theme-quartz .ag-row-odd {
  background: #f8fafc;
}

.ag-theme-quartz .ag-cell {
  padding-top: 6px;
  padding-bottom: 6px;
}

.ag-theme-quartz .ag-header {
  border-bottom: 1px solid #cbd5e1;
}
</style>
