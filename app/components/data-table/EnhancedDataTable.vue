<script setup lang="ts" generic="T extends Record<string, unknown>">
import { ref, computed, watch } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import type {
  ColDef,
  ColGroupDef,
  GridApi,
  GridReadyEvent,
  RowClickedEvent,
  FilterChangedEvent
} from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { cn } from '@/lib/utils'
import { useDataGrid } from '@/composables/useDataGrid'
import type { FilterChip } from '@/components/filters/FilterChips.vue'

export interface EnhancedDataTableProps<T = Record<string, unknown>> {
  data: T[]
  columnDefs: (ColDef<T> | ColGroupDef<T>)[]
  height?: string
  rowHeight?: number
  headerHeight?: number
  enableSearch?: boolean
  enableExport?: boolean
  enableRowSelection?: boolean
  enablePagination?: boolean
  enableFloatingFilters?: boolean
  pageSize?: number
  persistKey?: string
  isLoading?: boolean
  class?: string
  title?: string
  description?: string
}

const props = withDefaults(defineProps<EnhancedDataTableProps<T>>(), {
  height: '600px',
  rowHeight: 42,
  headerHeight: 48,
  enableSearch: true,
  enableExport: true,
  enableRowSelection: false,
  enablePagination: false,
  enableFloatingFilters: true,
  pageSize: 100,
  isLoading: false,
  persistKey: undefined,
  class: '',
  title: undefined,
  description: undefined,
})

const emit = defineEmits<{
  rowClicked: [data: T]
  selectionChanged: [selectedRows: T[]]
  ready: [api: GridApi<T>]
  filtersChanged: [filters: FilterChip[]]
}>()

const { gridApi, onGridReady: handleGridReady, setQuickFilter, exportToCsv } = useDataGrid({
  persistKey: props.persistKey,
  enableExport: props.enableExport,
})

const searchText = ref('')
const activeFilters = ref<FilterChip[]>([])

// Enhanced column defs with floating filters
const enhancedColumnDefs = computed(() => {
  return props.columnDefs.map((colDef) => {
    if ('children' in colDef) {
      // Column group
      return colDef
    }

    return {
      ...colDef,
      floatingFilter: props.enableFloatingFilters,
    } as ColDef<T>
  })
})

// Grid options
const defaultColDef = computed<ColDef>(() => ({
  sortable: true,
  filter: true,
  resizable: true,
  minWidth: 100,
  floatingFilter: props.enableFloatingFilters,
}))

const gridOptions = computed(() => ({
  rowHeight: props.rowHeight,
  headerHeight: props.headerHeight + (props.enableFloatingFilters ? 32 : 0), // Extra space for floating filters
  rowSelection: (props.enableRowSelection ? 'multiple' : undefined) as 'multiple' | undefined,
  pagination: props.enablePagination,
  paginationPageSize: props.pageSize,
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

// Filter changed
const onFilterChanged = (event: FilterChangedEvent) => {
  if (!gridApi.value) return

  const filterModel = gridApi.value.getFilterModel()
  const filters: FilterChip[] = []

  Object.entries(filterModel).forEach(([field, filterData]) => {
    const column = gridApi.value?.getColumn(field)
    const headerName = column?.getColDef().headerName || field

    // Handle different filter types
    if (filterData && typeof filterData === 'object') {
      if ('filter' in filterData) {
        filters.push({
          key: field,
          label: headerName,
          value: String(filterData.filter),
          removable: true,
        })
      } else if ('values' in filterData && Array.isArray(filterData.values)) {
        filters.push({
          key: field,
          label: headerName,
          value: `${filterData.values.length} selezionati`,
          removable: true,
        })
      }
    }
  })

  activeFilters.value = filters
  emit('filtersChanged', filters)
}

// Remove single filter
const removeFilter = (key: string) => {
  if (!gridApi.value) return
  const filterInstance = gridApi.value.getFilterInstance(key)
  if (filterInstance) {
    filterInstance.setModel(null)
    gridApi.value.onFilterChanged()
  }
}

// Clear all filters
const clearAllFilters = () => {
  if (!gridApi.value) return
  gridApi.value.setFilterModel(null)
  searchText.value = ''
}

// Watch search text and apply quick filter
watch(searchText, (newValue) => {
  setQuickFilter(newValue)
})

// Loading overlay
const loadingOverlayComponent = computed(() =>
  props.isLoading ? 'agLoadingOverlay' : undefined
)
</script>

<template>
  <!-- Hidden element to force Tailwind to include classes used in JS -->
  <div class="hidden text-sm text-xs text-right text-center text-muted-foreground font-mono font-semibold" />

  <div class="flex flex-col gap-4">
    <!-- Header -->
    <div v-if="title || description" class="flex flex-col gap-1">
      <h2 v-if="title" class="text-lg font-semibold">{{ title }}</h2>
      <p v-if="description" class="text-sm text-muted-foreground">{{ description }}</p>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-3">
        <div v-if="enableSearch" class="relative w-full max-w-sm">
          <UIcon
            name="i-lucide-search"
            class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <input
            v-model="searchText"
            type="search"
            placeholder="Cerca in tutti i campi..."
            class="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none ring-1 ring-transparent transition focus:border-ring focus:ring-ring/30"
          >
        </div>

        <div class="flex gap-2">
          <UButton
            v-if="activeFilters.length > 0"
            size="sm"
            variant="ghost"
            color="gray"
            @click="clearAllFilters"
          >
            <UIcon name="i-lucide-filter-x" class="mr-2 h-4 w-4" />
            Rimuovi filtri
          </UButton>

          <UButton
            v-if="enableExport"
            size="sm"
            variant="outline"
            @click="exportToCsv('export')"
          >
            <UIcon name="i-lucide-download" class="mr-2 h-4 w-4" />
            Esporta CSV
          </UButton>

          <slot name="toolbar-actions" />
        </div>
      </div>

      <!-- Active Filters -->
      <FilterChips
        :filters="activeFilters"
        @remove="removeFilter"
        @clear-all="clearAllFilters"
      />
    </div>

    <!-- AG Grid -->
    <ClientOnly>
      <div :class="cn('ag-theme-quartz', className)" :style="{ height }">
        <AgGridVue
          :row-data="data"
          :column-defs="enhancedColumnDefs"
          :default-col-def="defaultColDef"
          :grid-options="gridOptions"
          :loading-overlay-component="loadingOverlayComponent"
          @grid-ready="onGridReady"
          @row-clicked="onRowClicked"
          @selection-changed="onSelectionChanged"
          @filter-changed="onFilterChanged"
        />
      </div>
      <template #fallback>
        <div
          class="flex items-center justify-center rounded-lg border border-border bg-muted/10"
          :style="{ height }"
        >
          <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </template>
    </ClientOnly>

    <!-- Stats footer (optional slot) -->
    <slot name="footer" />
  </div>
</template>

<style scoped>
/* Enhance floating filter appearance */
:deep(.ag-theme-quartz .ag-floating-filter-input) {
  font-size: 0.88rem;
  line-height: 1.45;
}

:deep(.ag-theme-quartz .ag-floating-filter-button) {
  color: hsl(var(--muted-foreground));
}

:deep(.ag-theme-quartz .ag-floating-filter-button:hover) {
  color: hsl(var(--foreground));
}
</style>
