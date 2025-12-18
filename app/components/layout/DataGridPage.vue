<script setup lang="ts">
/**
 * DataGridPage.vue
 * 
 * A specialized page layout for displaying a DataGrid.
 * wraps MainPage and allows for standard grid headers and layout.
 */

import MainPage from './MainPage.vue'
import type { DataGridConfig } from '~/types/data-grid'

defineOptions({
  inheritAttrs: false
})

interface Props {
  title: string
  subtitle?: string
  gridConfig: DataGridConfig
  rowData: any[]
  loading?: boolean
  gridHeight?: string
  
  // Empty state
  emptyStateTitle?: string
  emptyStateMessage?: string

  // Toolbar
  toolbarPlaceholder?: string
  exportFilename?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  gridHeight: 'calc(100vh - 240px)', // Fallback default
  toolbarPlaceholder: 'Cerca...',
  exportFilename: 'export'
})

const emit = defineEmits(['grid-ready'])

const onGridReady = (params: any) => {
  emit('grid-ready', params)
}
</script>

<template>
  <MainPage :loading="loading">
    <template #header>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
          <div>
            <p v-if="subtitle" class="text-xs uppercase tracking-wide font-medium text-[hsl(var(--muted-foreground))]">
              {{ subtitle }}
            </p>
            <h1 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {{ title }}
            </h1>
          </div>
        </div>

        <!-- Toolbar Actions Slot (e.g. WBS Toggle, Badges, Total) -->
        <div class="flex flex-wrap items-center gap-3">
          <slot name="actions"></slot>
        </div>
      </div>
    </template>

    <template #default>
      <DataGrid
        v-bind="$attrs"
        :config="gridConfig"
        :row-data="rowData"
        :loading="loading"
        :height="gridHeight"
        class="flex-1 min-h-0"
        :toolbar-placeholder="toolbarPlaceholder"
        :export-filename="exportFilename"
        :empty-state-title="emptyStateTitle"
        :empty-state-message="emptyStateMessage"
        @grid-ready="onGridReady"
      />
    </template>

    <!-- Sidebar Pass-through -->
    <template v-if="$slots.sidebar" #sidebar>
      <slot name="sidebar"></slot>
    </template>
  </MainPage>
</template>
