<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCurrentContext } from '~/composables/useCurrentContext'
import { useColorMode } from '#imports'
import DataGridPage from '~/components/layout/DataGridPage.vue'

definePageMeta({
  breadcrumb: 'Confronto',
})

const route = useRoute()
const router = useRouter()
const projectId = route.params.id as string
const estimateId = route.params.estimateId as string
const colorMode = useColorMode()
const { setCurrentEstimate } = useCurrentContext()

await setCurrentEstimate(estimateId).catch((err) => console.error('Failed to set current estimate', err))

// ─────────────────────────────────────────────────────────────────────────────
// FILTERS
// ─────────────────────────────────────────────────────────────────────────────
const selectedRound = ref<string | null>((route.query.round as string) || null)
const selectedCompany = ref<string | null>((route.query.company as string) || null)

// Update URL when filters change
watch([selectedRound, selectedCompany], () => {
  const q: Record<string, string> = {}
  if (selectedRound.value) q.round = selectedRound.value
  if (selectedCompany.value) q.company = selectedCompany.value
  router.replace({ query: q })
})

// ─────────────────────────────────────────────────────────────────────────────
// DATA FETCHING
// ─────────────────────────────────────────────────────────────────────────────
const apiUrl = computed(() => {
  const params = new URLSearchParams()
  if (selectedRound.value) params.set('round', selectedRound.value)
  if (selectedCompany.value) params.set('company', selectedCompany.value)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return `/api/projects/${projectId}/estimate/${estimateId}/comparison${suffix}`
})

interface ComparisonResponse {
  voci: any[]
  imprese: { nome: string; round_number?: number; round_label?: string }[]
  rounds: { numero: number; label: string }[]
  all_rounds: { numero: number; label: string }[]
  all_imprese: { nome: string }[]
}

const { data: comparison, status } = await useFetch<ComparisonResponse>(apiUrl, {
  watch: [apiUrl],
  immediate: true,
})

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTED DATA
// ─────────────────────────────────────────────────────────────────────────────
const isLoading = computed(() => status.value === 'pending')
const rows = computed(() => comparison.value?.voci || [])

const roundOptions = computed(() => {
  if (comparison.value?.all_rounds?.length) {
    return comparison.value.all_rounds.map(r => ({ numero: r.numero, label: `Round ${r.numero}` }))
  }
  return []
})

const companyOptions = computed(() => {
  if (comparison.value?.all_imprese?.length) {
    return comparison.value.all_imprese.map(c => ({ nome: c.nome }))
  }
  return []
})


// ─────────────────────────────────────────────────────────────────────────────
// WBS Tree Types and State
// ─────────────────────────────────────────────────────────────────────────────
interface WbsNode {
  id: string
  code: string
  name: string
  level: number
  children?: WbsNode[]
}

const selectedWbsNode = ref<WbsNode | null>(null)

const wbsNodes = computed<WbsNode[]>(() => {
  const wbs6Map = new Map<string, WbsNode>()
  
  for (const item of rows.value) {
    // Process WBS 6
    if (item.wbs6_code && item.wbs6_description) {
      if (!wbs6Map.has(item.wbs6_code)) {
        wbs6Map.set(item.wbs6_code, {
          id: item.wbs6_code,
          code: item.wbs6_code,
          name: item.wbs6_description,
          level: 6,
          children: [],
        })
      }
      
      // Process WBS 7 (child of WBS 6)
      if (item.wbs7_code && item.wbs7_description) {
        const wbs7Key = `${item.wbs6_code}/${item.wbs7_code}`
        
        // Add to WBS 6 children if not already present
        const parentNode = wbs6Map.get(item.wbs6_code)!
        if (!parentNode.children!.find(c => c.id === wbs7Key)) {
          const wbs7Node: WbsNode = {
            id: wbs7Key,
            code: item.wbs7_code,
            name: item.wbs7_description,
            level: 7,
            children: [],
          }
          parentNode.children!.push(wbs7Node)
        }
      }
    }
  }
  
  // Sort WBS 6
  const rootNodes = Array.from(wbs6Map.values()).sort((a, b) => a.code.localeCompare(b.code))
  
  // Sort WBS 7 children
  for (const node of rootNodes) {
    if (node.children) {
      node.children.sort((a, b) => a.code.localeCompare(b.code))
    }
  }
  
  return rootNodes
})

// Apply WBS filter client-side
const filteredRows = computed(() => {
  if (!selectedWbsNode.value) return rows.value
  
  const selectedNode = selectedWbsNode.value
  
  return rows.value.filter(item => {
    if (selectedNode.level === 6) {
      return item.wbs6_code === selectedNode.code
    } else if (selectedNode.level === 7) {
      const [parentCode, myCode] = selectedNode.id.split('/')
      return item.wbs6_code === parentCode && item.wbs7_code === myCode
    }
    return false
  })
})

// Stats
const totalItems = computed(() => filteredRows.value.length)

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────
const fmtNumber = (v: any) =>
  new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0)

const fmtCurrency = (v: any) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(v) || 0)

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN DEFINITIONS (AG Grid)
// ─────────────────────────────────────────────────────────────────────────────
const getCompanyColor = (index: number) => {
  const colors = [
    { bg: 'rgba(59, 130, 246, 0.06)', border: 'rgba(59, 130, 246, 0.15)' }, // blue
    { bg: 'rgba(249, 115, 22, 0.06)', border: 'rgba(249, 115, 22, 0.15)' }, // orange
    { bg: 'rgba(139, 92, 246, 0.06)', border: 'rgba(139, 92, 246, 0.15)' }, // purple
    { bg: 'rgba(236, 72, 153, 0.06)', border: 'rgba(236, 72, 153, 0.15)' }, // pink
    { bg: 'rgba(34, 197, 94, 0.06)', border: 'rgba(34, 197, 94, 0.15)' }, // green
  ]
  return colors[index % colors.length]
}

const getDeltaStyle = (value: number | null | undefined) => {
  if (value == null || Math.abs(value) < 0.01) return {}
  return {
    color: value > 0 ? '#ef4444' : '#22c55e',
    fontWeight: '600',
  }
}

const baseColumns = [
  {
    headerName: 'DATI PROGETTO',
    headerClass: 'ag-header-group-cell-label',
    children: [
      { field: 'codice', headerName: 'Codice', width: 130, pinned: 'left' as const },
      { field: 'descrizione', headerName: 'Descrizione', width: 280, pinned: 'left' as const },
      { field: 'um', headerName: 'UM', width: 70 },
      {
        field: 'quantita',
        headerName: 'Q.tà',
        width: 100,
        type: 'numericColumn',
        valueFormatter: ({ value }: any) => fmtNumber(value),
      },
      {
        field: 'prezzo_unitario_progetto',
        headerName: 'P.U.',
        width: 110,
        type: 'numericColumn',
        valueFormatter: ({ value }: any) => fmtCurrency(value),
        cellStyle: { fontWeight: '600' },
      },
      {
        field: 'importo_totale_progetto',
        headerName: 'Importo',
        width: 130,
        type: 'numericColumn',
        valueFormatter: ({ value }: any) => fmtCurrency(value),
        cellStyle: { fontWeight: '600' },
      },
    ]
  },
  {
    headerName: 'STATISTICHE',
    headerClass: 'ag-header-group-cell-label',
    children: [
      {
        field: 'media_prezzi',
        headerName: 'Media',
        width: 110,
        type: 'numericColumn',
        valueFormatter: ({ value }: any) => (value != null ? fmtCurrency(value) : '-'),
        cellStyle: { fontStyle: 'italic', backgroundColor: 'rgba(0,0,0,0.02)' },
      },
      {
        field: 'minimo_prezzi',
        headerName: 'Min',
        width: 100,
        type: 'numericColumn',
        valueFormatter: ({ value }: any) => (value != null ? fmtCurrency(value) : '-'),
        cellStyle: { color: '#22c55e', fontWeight: '500' },
      },
      {
        field: 'massimo_prezzi',
        headerName: 'Max',
        width: 100,
        type: 'numericColumn',
        valueFormatter: ({ value }: any) => (value != null ? fmtCurrency(value) : '-'),
        cellStyle: { color: '#ef4444', fontWeight: '500' },
      },
    ]
  }
]

const companyColumns = computed(() => {
  // Use filtered imprese from the API response to render columns
  const visibleCompanies = comparison.value?.imprese || []
  
  return visibleCompanies.map((company, idx) => {
    const key = company.nome
    const color = getCompanyColor(idx)

    return {
      headerName: company.round_label ? `${key} (${company.round_label})` : key,
      headerClass: 'ag-header-group-cell-label',
      // Ensure groupId allows proper header rendering
      groupId: `group_${key}`,
      children: [
        {
          field: `offerte.${key}.quantita`,
          headerName: 'Q.tà',
          width: 90,
          type: 'numericColumn',
          filter: 'number',
          valueFormatter: ({ value }: any) => (value != null ? fmtNumber(value) : '-'),
          cellStyle: { backgroundColor: color?.bg },
        },
        // NEW/FIX: Add Delta Quantity Column
        {
          field: `offerte.${key}.delta_quantita`,
          headerName: 'Δ Q.tà',
          width: 90,
          type: 'numericColumn',
          filter: 'number',
          valueFormatter: ({ value }: any) =>
            value != null && Math.abs(value) >= 0.01 ? `${value > 0 ? '+' : ''}${fmtNumber(value)}` : '-',
          cellStyle: (params: any) => ({
            backgroundColor: color?.bg,
            // Reuse delta style logic which applies red/green based on value
            ...getDeltaStyle(params.value),
          }),
        },
        {
          field: `offerte.${key}.prezzo_unitario`,
          headerName: 'Prezzo',
          width: 110,
          type: 'numericColumn',
          filter: 'number',
          valueFormatter: ({ value }: any) => (value != null ? fmtCurrency(value) : '-'),
          cellStyle: { backgroundColor: color?.bg },
        },
        // NEW: Delta Unit Price vs Mean
        {
          field: `offerte.${key}.delta_prezzo_media`,
          headerName: 'Δ Media',
          width: 100,
          type: 'numericColumn',
          filter: 'number',
          valueGetter: (params: any) => {
             try {
                const data = params.data;
                const price = data.offerte?.[key]?.prezzo_unitario;
                const mean = data.media_prezzi;
                if (price != null && mean != null) {
                  return price - mean;
                }
                return null;
             } catch(e) { return null }
          },
          valueFormatter: ({ value }: any) =>
            value != null && Math.abs(value) >= 0.01 ? `${value > 0 ? '+' : ''}${fmtCurrency(value)}` : '-',
          cellStyle: (params: any) => ({
            backgroundColor: color?.bg,
            ...getDeltaStyle(params.value),
          }),
        },
        // NEW: Delta Unit Price vs Project
        {
          field: `offerte.${key}.delta_prezzo_progetto`,
          headerName: 'Δ P.U.',
          width: 100,
          type: 'numericColumn',
          filter: 'number',
          valueGetter: (params: any) => {
            const data = params.data;
            const price = data.offerte?.[key]?.prezzo_unitario;
            const projPrice = data.prezzo_unitario_progetto;
            if (price != null && projPrice != null) {
              return price - projPrice;
            }
            return null;
          },
          valueFormatter: ({ value }: any) =>
            value != null && Math.abs(value) >= 0.01 ? `${value > 0 ? '+' : ''}${fmtCurrency(value)}` : '-',
          cellStyle: (params: any) => ({
            backgroundColor: color?.bg,
            ...getDeltaStyle(params.value),
          }),
        },
        {
          field: `offerte.${key}.importo_totale`,
          headerName: 'Importo',
          width: 120,
          type: 'numericColumn',
          filter: 'number',
          valueFormatter: ({ value }: any) => (value != null ? fmtCurrency(value) : '-'),
          cellStyle: { backgroundColor: color?.bg },
        },
        // NEW: Delta Total Amount vs Project
        {
          field: `offerte.${key}.delta_importo_progetto`,
          headerName: 'Δ Imp.',
          width: 120,
          type: 'numericColumn',
          filter: 'number',
          valueGetter: (params: any) => {
            const data = params.data;
            const amount = data.offerte?.[key]?.importo_totale;
            const projAmount = data.importo_totale_progetto;
            if (amount != null && projAmount != null) {
              return amount - projAmount;
            }
            return null;
          },
          valueFormatter: ({ value }: any) =>
            value != null && Math.abs(value) >= 0.01 ? `${value > 0 ? '+' : ''}${fmtCurrency(value)}` : '-',
          cellStyle: (params: any) => ({
            backgroundColor: color?.bg,
            borderRight: `2px solid ${color?.border}`,
            ...getDeltaStyle(params.value),
          }),
        },
      ],
    }
  })
})

const columns = computed(() => [...baseColumns, ...companyColumns.value])

const gridConfig = computed(() => ({
  columns: columns.value,
  defaultColDef: {
    sortable: true,
    resizable: true,
    suppressHeaderMenuButton: true,
  },
  rowHeight: 48,
  headerHeight: 90,
  groupHeaderHeight: 50,
}))

// ─────────────────────────────────────────────────────────────────────────────
// EVENT HANDLERS
// ─────────────────────────────────────────────────────────────────────────────
const onWbsSelect = (node: WbsNode | null) => {
  selectedWbsNode.value = node
}
</script>

<template>
  <DataGridPage
    title="Round e Imprese"
    subtitle="Confronto Offerte"
    :grid-config="gridConfig"
    :row-data="filteredRows"
    :loading="isLoading"
    toolbar-placeholder="Cerca voce..."
    empty-state-title="Nessuna voce"
    empty-state-message="Carica un ritorno di gara per vedere il confronto."
  >
    <!-- Actions / Filters -->
    <template #actions>
      <UBadge color="neutral" variant="soft">{{ totalItems }} voci</UBadge>

      <!-- Round Filter Popover -->
      <UPopover>
        <UButton
          :color="selectedRound ? 'primary' : 'neutral'"
          :variant="selectedRound ? 'soft' : 'outline'"
          size="sm"
          icon="i-heroicons-funnel"
          trailing-icon="i-heroicons-chevron-down"
        >
          {{ selectedRound ? `Round ${selectedRound}` : 'Round' }}
        </UButton>
        <template #content>
          <div class="p-2 min-w-[160px]">
            <p class="text-xs font-semibold text-gray-500 mb-2 px-2">Seleziona Round</p>
            <div class="space-y-1">
              <button
                class="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                :class="{ 'bg-primary-50 dark:bg-primary-900/20 text-primary-600': !selectedRound }"
                @click="selectedRound = null"
              >
                <UIcon v-if="!selectedRound" name="i-heroicons-check" class="w-4 h-4" />
                <span :class="{ 'ml-6': selectedRound }">Tutti i round</span>
              </button>
              <button
                v-for="r in roundOptions"
                :key="r.numero"
                class="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                :class="{ 'bg-primary-50 dark:bg-primary-900/20 text-primary-600': selectedRound === String(r.numero) }"
                @click="selectedRound = String(r.numero)"
              >
                <UIcon v-if="selectedRound === String(r.numero)" name="i-heroicons-check" class="w-4 h-4" />
                <span :class="{ 'ml-6': selectedRound !== String(r.numero) }">{{ r.label }}</span>
              </button>
            </div>
          </div>
        </template>
      </UPopover>

      <!-- Company Filter Popover -->
      <UPopover>
        <UButton
          :color="selectedCompany ? 'primary' : 'neutral'"
          :variant="selectedCompany ? 'soft' : 'outline'"
          size="sm"
          icon="i-heroicons-building-office-2"
          trailing-icon="i-heroicons-chevron-down"
        >
          {{ selectedCompany || 'Impresa' }}
        </UButton>
        <template #content>
          <div class="p-2 min-w-[180px]">
            <p class="text-xs font-semibold text-gray-500 mb-2 px-2">Seleziona Impresa</p>
            <div class="space-y-1">
              <button
                class="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                :class="{ 'bg-primary-50 dark:bg-primary-900/20 text-primary-600': !selectedCompany }"
                @click="selectedCompany = null"
              >
                <UIcon v-if="!selectedCompany" name="i-heroicons-check" class="w-4 h-4" />
                <span :class="{ 'ml-6': selectedCompany }">Tutte le imprese</span>
              </button>
              <button
                v-for="c in companyOptions"
                :key="c.nome"
                class="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                :class="{ 'bg-primary-50 dark:bg-primary-900/20 text-primary-600': selectedCompany === c.nome }"
                @click="selectedCompany = c.nome"
              >
                <UIcon v-if="selectedCompany === c.nome" name="i-heroicons-check" class="w-4 h-4" />
                <span :class="{ 'ml-6': selectedCompany !== c.nome }">{{ c.nome }}</span>
              </button>
            </div>
          </div>
        </template>
      </UPopover>

      <!-- Active Filters Display -->
      <template v-if="selectedRound || selectedCompany || selectedWbsNode">
        <div class="h-4 w-px bg-gray-300 dark:bg-gray-600" />
        <div class="flex items-center gap-2 flex-wrap">
          <UBadge v-if="selectedRound" color="primary" variant="soft" class="gap-1">
            <span>Round {{ selectedRound }}</span>
            <UButton
              icon="i-heroicons-x-mark"
              color="primary"
              variant="link"
              size="xs"
              class="p-0 h-4 w-4"
              @click="selectedRound = null"
            />
          </UBadge>
          <UBadge v-if="selectedCompany" color="primary" variant="soft" class="gap-1">
            <span>{{ selectedCompany }}</span>
            <UButton
              icon="i-heroicons-x-mark"
              color="primary"
              variant="link"
              size="xs"
              class="p-0 h-4 w-4"
              @click="selectedCompany = null"
            />
          </UBadge>
          <UBadge v-if="selectedWbsNode" color="primary" variant="soft" class="gap-1">
            <span>{{ selectedWbsNode.code }}</span>
            <UButton
              icon="i-heroicons-x-mark"
              color="primary"
              variant="link"
              size="xs"
              class="p-0 h-4 w-4"
              @click="selectedWbsNode = null"
            />
          </UBadge>
        </div>
      </template>
    </template>

    <!-- Sidebar -->
    <template #sidebar>
       <WbsSidebar
        v-if="wbsNodes.length > 0"
        :nodes="wbsNodes"
        :visible="true"
        @node-selected="onWbsSelect"
      />
    </template>
  </DataGridPage>
</template>
