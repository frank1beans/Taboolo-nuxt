<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Progetto</p>
        <h1 class="text-3xl font-bold tracking-tight">Preventivi</h1>
        <p class="text-muted-foreground">Gestisci i computi di progetto e le offerte.</p>
      </div>
      <div class="flex items-center gap-2">
        <UButton variant="outline" @click="showRoundUpload = true">
          <UIcon name="i-lucide-upload" class="mr-2 h-4 w-4" />
          Carica Offerta
        </UButton>
        <UButton @click="showProjectUpload = true">
          <UIcon name="i-lucide-plus" class="mr-2 h-4 w-4" />
          Nuovo Computo
        </UButton>
      </div>
    </div>

    <!-- Debug Info -->
    <div class="rounded-xl border bg-yellow-100 dark:bg-yellow-900 p-4 text-sm">
      <p><strong>DEBUG:</strong></p>
      <p>Project ID: {{ projectId }}</p>
      <p>Is Loading: {{ isLoading }}</p>
      <p>Estimates Count: {{ estimates?.length ?? 0 }}</p>
      <p>Estimates Data: {{ JSON.stringify(estimates) }}</p>
    </div>

    <!-- Estimates Table -->
    <div class="rounded-xl border bg-card text-card-foreground shadow">
      <div class="p-6">
        <ClientOnly>
          <DataTable
            :data="estimates || []"
            :column-defs="columnDefs"
            :is-loading="isLoading"
            :enable-search="true"
            :enable-export="true"
            @row-clicked="handleRowClick"
          />
        </ClientOnly>
      </div>
    </div>

    <ComputoProgettoUploadDialog
      v-if="projectId"
      :open="showProjectUpload"
      :project-id="projectId"
      @close="showProjectUpload = false"
      @success="handleUploadSuccess"
    />

    <RoundUploadDialog
      v-if="projectId"
      :open="showRoundUpload"
      :project-id="projectId"
      @close="showRoundUpload = false"
      @success="handleUploadSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEstimates } from '@/composables/queries/useEstimateQueries'
import DataTable from '@/components/data-table/DataTable.vue'
import ComputoProgettoUploadDialog from '@/components/upload/ComputoProgettoUploadDialog.vue'
import RoundUploadDialog from '@/components/upload/RoundUploadDialog.vue'
import type { ColDef, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community'

type EstimateRow = {
  id: string
  name?: string
  type?: string
  revision?: string | null
  discipline?: string | null
  round_number?: number | null
  total_amount?: number | null
  is_baseline?: boolean
  created_at?: string | Date | null
}

const route = useRoute()
const router = useRouter()
const projectId = computed(() => String(route.params.id))

const { data: estimates, isLoading, refetch } = useEstimates(projectId)

// Debug log
console.log('🔍 Debug - estimates:', estimates.value)
console.log('🔍 Debug - isLoading:', isLoading.value)
console.log('🔍 Debug - projectId:', projectId.value)

const showProjectUpload = ref(false)
const showRoundUpload = ref(false)

const columnDefs: ColDef<EstimateRow>[] = [
  { headerName: 'Nome', field: 'name', flex: 2, minWidth: 200 },
  { 
    headerName: 'Tipo', 
    field: 'type', 
    width: 120,
    valueFormatter: (params: ValueFormatterParams<EstimateRow, string>) =>
      params.value === 'project' ? 'Baseline' : 'Offerta'
  },
  { headerName: 'Revisione', field: 'revision', width: 120 },
  { headerName: 'Disciplina', field: 'discipline', width: 150 },
  { headerName: 'Round', field: 'round_number', width: 100 },
  { 
    headerName: 'Totale', 
    field: 'total_amount', 
    valueFormatter: (params) => params.value ? `€ ${params.value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '-', 
    flex: 1,
    minWidth: 150
  },
  { 
    headerName: 'Baseline', 
    field: 'is_baseline', 
    cellRenderer: (params: ICellRendererParams<EstimateRow, boolean | undefined>) =>
      params.value ? 'baseline' : '', 
    width: 100, 
    cellClass: 'text-center' 
  },
  { 
    headerName: 'Creato il', 
    field: 'created_at', 
    valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('it-IT') : '', 
    width: 120 
  }
]

const handleRowClick = (row: EstimateRow) => {
  router.push(`/projects/${projectId.value}/estimate/${row.id}`)
}

const handleUploadSuccess = () => {
  refetch()
}
</script>
