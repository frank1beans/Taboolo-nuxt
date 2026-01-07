<script setup lang="ts">
/**
 * DataGridPage.vue
 * 
 * A specialized page layout for displaying a DataGrid.
 * wraps MainPage and allows for standard grid headers and layout.
 */

import MainPage from './MainPage.vue'
import PageHeader from './PageHeader.vue'
import type { DataGridConfig, DataGridRowActions, ActiveFilter } from '~/types/data-grid'
import type { GridReadyEvent } from 'ag-grid-community'

defineOptions({
  inheritAttrs: false
})

interface Props {
  title: string
  subtitle?: string // Maps to 'meta' in PageHeader
  gridConfig: DataGridConfig
  rowData: Record<string, unknown>[]
  loading?: boolean
  gridHeight?: string
  divider?: boolean // Control PageHeader divider visibility
  
  // Empty state
  emptyStateTitle?: string
  emptyStateMessage?: string
  showEmptyAction?: boolean
  emptyStateActionLabel?: string
  showEmptySecondaryAction?: boolean
  emptyStateSecondaryActionLabel?: string
  emptyStateSecondaryActionIcon?: string

  // Grid behavior
  rowClickable?: boolean
  rowAriaLabel?: string
  stickyHeader?: boolean

  toolbarPlaceholder?: string
  exportFilename?: string

  // Selection
  enableRowSelection?: boolean
  selectionMode?: 'single' | 'multiple'

  // Row actions + row id
  rowActions?: DataGridRowActions
  getRowId?: string | ((row: Record<string, unknown>) => string)
  onSelectionChange?: (selectedIds: string[], selectedRows: Record<string, unknown>[]) => void

  // External filters (e.g. WBS)
  externalFilters?: ActiveFilter[]
  onExternalFilterRemove?: (field: string) => void
  flat?: boolean
  selectionKey?: string
}

const _props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  loading: false,
  gridHeight: '100%',
  divider: false,
  toolbarPlaceholder: 'Cerca...',
  exportFilename: 'export',
  emptyStateTitle: 'Nessun dato disponibile',
  emptyStateMessage: 'Non ci sono dati da visualizzare.',
  showEmptyAction: false,
  emptyStateActionLabel: 'Ricarica',
  showEmptySecondaryAction: false,
  emptyStateSecondaryActionLabel: 'Azione',
  emptyStateSecondaryActionIcon: 'i-heroicons-plus',
  rowClickable: false,
  rowAriaLabel: undefined,
  stickyHeader: true,
  enableRowSelection: true,
  selectionMode: 'multiple',
  flat: true,
  selectionKey: undefined
})

const emit = defineEmits<{
  'grid-ready': [GridReadyEvent<Record<string, unknown>>]
}>()

const onGridReady = (params: GridReadyEvent<Record<string, unknown>>) => {
  emit('grid-ready', params)
}
</script>

<template>
  <MainPage :loading="loading">
    <template #header>
      <PageHeader :title="title" :meta="subtitle" :divider="_props.divider">
        <!-- Subtitle Slot pass-through (header-meta) -> PageHeader 'meta' slot -->
        <template #meta>
           <slot name="header-meta">
              {{ subtitle }}
           </slot>
        </template>

        <!-- Actions Slot pass-through -> PageHeader 'rightSlot' -->
        <template #rightSlot>
           <slot name="actions" />
        </template>
      </PageHeader>
    </template>

    <template #default>
      <!-- Content wrapper for proper vertical flex layout -->
      <div class="flex-1 min-h-0 flex flex-col">
        <!-- Toolbar slot - tight spacing -->
        <div v-if="$slots['pre-grid']" class="flex-shrink-0">
          <slot name="pre-grid" />
        </div>
        
        <!-- DataGrid - fills remaining vertical space -->
        <DataGrid
          v-bind="$attrs"
          :config="gridConfig"
          :row-data="rowData"
          :loading="loading"
          :height="gridHeight"
          class="flex-1 min-h-0 rounded-lg overflow-hidden"
          :toolbar-placeholder="toolbarPlaceholder"
          :export-filename="exportFilename"
          :empty-state-title="emptyStateTitle"
          :empty-state-message="emptyStateMessage"
          :show-empty-action="showEmptyAction"
          :empty-action-label="emptyStateActionLabel"
          :show-empty-secondary-action="showEmptySecondaryAction"
          :empty-secondary-action-label="emptyStateSecondaryActionLabel"
          :empty-secondary-action-icon="emptyStateSecondaryActionIcon"
          :row-clickable="rowClickable"
          :row-aria-label="rowAriaLabel"
          :sticky-header="stickyHeader"
          :enable-row-selection="enableRowSelection"
          :selection-mode="selectionMode"
          :row-actions="rowActions"
          :get-row-id="getRowId"
          :on-selection-change="onSelectionChange"
          :external-filters="externalFilters"
          :on-external-filter-remove="onExternalFilterRemove"
          :flat="flat"
          :selection-key="selectionKey"
          @grid-ready="onGridReady"
        />
      </div>
    </template>

    <!-- Sidebar Pass-through -->
    <template v-if="$slots.sidebar" #sidebar>
      <slot name="sidebar"/>
    </template>
  </MainPage>
</template>
