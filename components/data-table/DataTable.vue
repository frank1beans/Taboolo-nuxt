<script setup lang="ts" generic="T extends Record<string, unknown>">
import { ref, computed, watch, toRefs } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import type { ColDef, ColGroupDef, GridApi, GridReadyEvent, RowClickedEvent } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { cn } from '@/lib/utils'
import { useDataGrid } from '@/composables/useDataGrid'

export interface DataTableProps<T = Record<string, unknown>> {
  data: T[]
  columnDefs: (ColDef<T> | ColGroupDef<T>)[]
  height?: string
  rowHeight?: number
  headerHeight?: number
  enableSearch?: boolean
  enableExport?: boolean
  enableRowSelection?: boolean
  enablePagination?: boolean
  pageSize?: number
  persistKey?: string
  isLoading?: boolean
  class?: string
}

const props = withDefaults(defineProps<DataTableProps<T>>(), {
  height: '600px',
  rowHeight: 42,
  headerHeight: 48,
  enableSearch: true,
  enableExport: true,
  enableRowSelection: false,
  enablePagination: false,
  pageSize: 100,
  isLoading: false,
  persistKey: undefined,
  class: '',
})

const emit = defineEmits<{
  rowClicked: [data: T]
  selectionChanged: [selectedRows: T[]]
  ready: [api: GridApi<T>]
}>()

const { gridApi, onGridReady: handleGridReady, setQuickFilter, exportToExcel } = useDataGrid({
  persistKey: props.persistKey,
  enableExport: props.enableExport,
})

const {
  data,
  columnDefs,
  height,
  rowHeight,
  headerHeight,
  enableSearch,
  enableExport,
  enableRowSelection,
  enablePagination,
  pageSize,
  isLoading,
  class: className,
} = toRefs(props)

const searchText = ref('')

// Grid options
const defaultColDef = computed<ColDef>(() => ({
  sortable: true,
  filter: true,
  resizable: true,
  minWidth: 100,
}))

const gridOptions = computed(() => ({
  rowHeight: rowHeight.value,
  headerHeight: headerHeight.value,
  rowSelection: enableRowSelection.value ? 'multiple' : undefined,
  pagination: enablePagination.value,
  paginationPageSize: pageSize.value,
  animateRows: true,
  enableCellTextSelection: true,
  suppressCellFocus: false,
}))

// Grid ready callback
const onGridReady = (params: GridReadyEvent) => {
  handleGridReady(params)
  emit('ready', params.api)
}

// Row clicked
const onRowClicked = (event: RowClickedEvent<T>) => {
  if (event.data) {
    emit('rowClicked', event.data)
  }
}

// Selection changed
const onSelectionChanged = () => {
  if (!gridApi.value) return
  const selectedRows = gridApi.value.getSelectedRows() as T[]
  emit('selectionChanged', selectedRows)
}

// Watch search text and apply quick filter
watch(searchText, (newValue) => {
  setQuickFilter(newValue)
})

// Loading overlay
const loadingOverlayComponent = computed(() =>
  isLoading.value ? 'agLoadingOverlay' : undefined
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Toolbar -->
    <div v-if="enableSearch || enableExport" class="flex items-center justify-between gap-3">
      <div v-if="enableSearch" class="relative w-full max-w-sm">
        <input
          v-model="searchText"
          type="search"
          placeholder="Cerca..."
          class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-1 ring-transparent transition focus:border-ring focus:ring-ring/30"
        >
      </div>

      <div v-if="enableExport" class="flex gap-2">
        <Button size="sm" variant="outline" @click="exportToExcel('export')">
          Esporta Excel
        </Button>
      </div>
    </div>

    <!-- AG Grid -->
    <div :class="cn('ag-theme-quartz', className)" :style="{ height }">
      <AgGridVue
        :row-data="data"
        :column-defs="columnDefs"
        :default-col-def="defaultColDef"
        :grid-options="gridOptions"
        :loading-overlay-component="loadingOverlayComponent"
        @grid-ready="onGridReady"
        @row-clicked="onRowClicked"
        @selection-changed="onSelectionChanged"
      />
    </div>
  </div>
</template>

<style>
/* AG Grid dark mode support */
.ag-theme-quartz {
  --ag-background-color: hsl(var(--background));
  --ag-foreground-color: hsl(var(--foreground));
  --ag-border-color: hsl(var(--border));
  --ag-header-background-color: hsl(var(--muted) / 0.3);
  --ag-odd-row-background-color: hsl(var(--muted) / 0.1);
  --ag-row-hover-color: hsl(var(--muted) / 0.3);
  --ag-selected-row-background-color: hsl(var(--primary) / 0.1);
}
</style>
