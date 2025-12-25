<script setup lang="ts">
/**
 * Global Price Catalog (All Projects)
 *
 * Mirrors the project price list layout, but aggregates items across projects
 * and adds a Project column for quick identification.
 */

import { computed, ref } from 'vue'
import type { DataGridConfig } from '~/types/data-grid'
import type { ApiPriceListItem } from '~/types/api'
import DataGridActions from '~/components/data-grid/DataGridActions.vue'
import DataGridPage from '~/components/layout/DataGridPage.vue'
import PageToolbar from '~/components/layout/PageToolbar.vue'
import { usePriceListGridConfig } from '~/composables/estimates/usePriceListGridConfig'
import { useWbsTree } from '~/composables/useWbsTree'

// Standardized header: removed breadcrumb
definePageMeta({})

const colorMode = useColorMode()

const { data: catalogItems, status } = await useFetch<ApiPriceListItem[]>('/api/catalog')

const loading = computed(() => status.value === 'pending')
const rowData = computed(() => catalogItems.value ?? [])

const {
  wbsNodes,
  selectedWbsNode,
  wbsSidebarVisible,
  filteredRowData,
  onWbsNodeSelected,
} = useWbsTree(rowData, {
  getLevels: (item: ApiPriceListItem) => {
    const levels: { code: string; name?: string; level?: number }[] = []
    if (item.wbs6_code && item.wbs6_description) {
      levels.push({ code: item.wbs6_code, name: item.wbs6_description, level: 6 })
    }
    if (item.wbs7_code && item.wbs7_description) {
      levels.push({ code: item.wbs7_code, name: item.wbs7_description, level: 7 })
    }
    return levels
  },
})

const { gridConfig: baseGridConfig } = usePriceListGridConfig(filteredRowData)

const gridConfig = computed<DataGridConfig>(() => {
  const projectColumn = {
    field: 'project_name',
    headerName: 'Progetto',
    width: 180,
    pinned: 'left' as const,
    valueGetter: (params: any) => {
      const data = params?.data
      if (!data) return ''
      if (data.project_code && data.project_name) {
        return `${data.project_code} • ${data.project_name}`
      }
      return data.project_name || data.project_code || '-'
    },
  }

  const columns = baseGridConfig.columns.map((col) => {
    if (col.field === 'total_quantity' || col.field === 'total_amount') {
      return { ...col, hide: true }
    }
    return col
  })
  const codeIdx = columns.findIndex((col) => col.field === 'code')
  const insertIdx = codeIdx >= 0 ? codeIdx + 1 : 1
  columns.splice(insertIdx, 0, projectColumn)

  return {
    ...baseGridConfig,
    columns,
  }
})

const projectCount = computed(() => {
  const ids = new Set<string>()
  filteredRowData.value.forEach((item) => {
    const key = item.project_id || item.project_code || item.project_name
    if (key) ids.add(String(key))
  })
  return ids.size
})

// Toolbar state
const searchText = ref('')
const gridApi = ref<any>(null)
const onGridReady = (params: any) => {
  gridApi.value = params.api
}

const handleReset = () => {
  searchText.value = ''
  onWbsNodeSelected(null)
  gridApi.value?.setFilterModel(null)
}

const handleExport = () => {
  gridApi.value?.exportDataAsExcel({ fileName: 'listino-globale' })
}
</script>

<template>
  <DataGridPage
    title="Listino Globale"
    :grid-config="gridConfig"
    :row-data="filteredRowData"
    :loading="loading"
    empty-state-title="Nessuna voce trovata"
    empty-state-message="Il catalogo globale non contiene ancora voci."
    :show-toolbar="false"
    :filter-text="searchText"
    @grid-ready="onGridReady"
  >
    <!-- Meta Info: Counts -->
    <template #header-meta>
       <div class="flex items-center gap-2">
         <span class="text-[hsl(var(--muted-foreground))] flex items-center gap-2">
            <Icon name="heroicons:list-bullet" class="w-4 h-4" />
            {{ filteredRowData.length }} voci
         </span>
         <span class="text-[hsl(var(--border))]">|</span>
         <span class="text-[hsl(var(--muted-foreground))] flex items-center gap-2">
            <Icon name="heroicons:building-office" class="w-4 h-4" />
            {{ projectCount }} progetti
         </span>
       </div>
    </template>

    <!-- Header Actions: Primary Page Actions -->
    <template #actions>
      <UButton
        :icon="wbsSidebarVisible ? 'i-heroicons-sidebar' : 'i-heroicons-sidebar'"
        color="neutral"
        variant="ghost"
        size="sm"
        :label="wbsSidebarVisible ? 'Nascondi WBS' : 'Mostra WBS'"
        @click="wbsSidebarVisible = !wbsSidebarVisible"
      />
    </template>

    <!-- Toolbar: Search & Grid Actions -->
    <template #pre-grid>
        <PageToolbar
          v-model="searchText"
          search-placeholder="Cerca voce..."
        >
          <template #left>
             <!-- WBS Filter Chip in Toolbar -->
             <UBadge v-if="selectedWbsNode" color="primary" variant="soft" class="gap-1.5 pl-2 pr-1 py-1 ml-2">
                <Icon name="heroicons:funnel-solid" class="w-3.5 h-3.5" />
                <span class="max-w-48 truncate">{{ selectedWbsNode.name }}</span>
                <UButton
                  icon="i-heroicons-x-mark"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  title="Rimuovi filtro WBS"
                  class="hover:bg-[hsl(var(--primary)/0.2)]"
                  @click="onWbsNodeSelected(null)"
                />
              </UBadge>
          </template>

          <template #right>
            <button
               v-if="searchText || selectedWbsNode"
               class="flex items-center justify-center h-9 px-4 rounded-full text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--background))] hover:text-[hsl(var(--foreground))] transition-colors"
               @click="handleReset"
            >
              <Icon name="heroicons:arrow-path" class="w-4 h-4 mr-2" />
              Reset
            </button>     

            <button
               class="btn-outline-theme"
               @click="handleExport"
            >
               Esporta
            </button>
          </template>
        </PageToolbar>
    </template>

    <template #sidebar>
      <WbsSidebar
        v-if="wbsSidebarVisible"
        :nodes="wbsNodes"
        :visible="true"
        @node-selected="onWbsNodeSelected"
      />
    </template>
  </DataGridPage>
</template>
