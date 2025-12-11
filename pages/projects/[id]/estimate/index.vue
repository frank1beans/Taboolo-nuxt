<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Progetto</p>
        <h1 class="text-3xl font-bold tracking-tight">Preventivi</h1>
        <p class="text-muted-foreground">Gestisci i computi di progetto e le offerte.</p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" @click="showRoundUpload = true">
          <UIcon name="i-lucide-upload" class="mr-2 h-4 w-4" />
          Carica Offerta
        </Button>
        <Button @click="showProjectUpload = true">
          <UIcon name="i-lucide-plus" class="mr-2 h-4 w-4" />
          Nuovo Computo
        </Button>
      </div>
    </div>

    <!-- Estimates Table -->
    <div class="rounded-xl border bg-card text-card-foreground shadow">
      <div class="p-6">
        <DataTable
          :data="estimates || []"
          :column-defs="columnDefs"
          :is-loading="isLoading"
          :enable-search="true"
          :enable-export="true"
          @row-clicked="handleRowClick"
        />
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
import Button from '@/components/ui/Button.vue'
import ComputoProgettoUploadDialog from '@/components/upload/ComputoProgettoUploadDialog.vue'
import RoundUploadDialog from '@/components/upload/RoundUploadDialog.vue'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { UIcon } from '#components'

type EstimateRow = {
  _id: string
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
const projectId = computed(() => Number(route.params.id))

const { data: estimates, isLoading, refetch } = useEstimates(projectId)

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
  router.push(`/projects/${projectId.value}/estimate/${row._id}`)
}

const handleUploadSuccess = () => {
  refetch()
}
</script>

