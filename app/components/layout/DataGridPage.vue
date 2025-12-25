<script setup lang="ts">
/**
 * DataGridPage.vue
 * 
 * A specialized page layout for displaying a DataGrid.
 * wraps MainPage and allows for standard grid headers and layout.
 */

import MainPage from './MainPage.vue'
import PageHeader from './PageHeader.vue'
import type { DataGridConfig } from '~/types/data-grid'
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

  // Toolbar
  toolbarPlaceholder?: string
  exportFilename?: string
}

const _props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  loading: false,
  gridHeight: 'calc(100vh - 240px)', // Fallback default
  divider: false, // No divider by default for cleaner look
  toolbarPlaceholder: 'Cerca...',
  exportFilename: 'export',
  emptyStateTitle: 'Nessun dato disponibile',
  emptyStateMessage: 'Non ci sono dati da visualizzare.'
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
      <div v-if="$slots['pre-grid']" class="mt-4">
        <slot name="pre-grid" />
      </div>
      <DataGrid
        v-bind="$attrs"
        :config="gridConfig"
        :row-data="rowData"
        :loading="loading"
        :height="gridHeight"
        class="flex-1 min-h-0 mt-2"
        :toolbar-placeholder="toolbarPlaceholder"
        :export-filename="exportFilename"
        :empty-state-title="emptyStateTitle"
        :empty-state-message="emptyStateMessage"
        @grid-ready="onGridReady"
      />
    </template>

    <!-- Sidebar Pass-through -->
    <template v-if="$slots.sidebar" #sidebar>
      <slot name="sidebar"/>
    </template>
  </MainPage>
</template>
