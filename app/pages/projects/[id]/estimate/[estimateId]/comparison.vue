<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCurrentContext } from '~/composables/useCurrentContext'
import { useColorMode } from '#imports'
import DataGridPage from '~/components/layout/DataGridPage.vue'
import PageToolbar from '~/components/layout/PageToolbar.vue'
import { useWbsTree } from '~/composables/useWbsTree'
import { useSidebarModules } from '~/composables/useSidebarModules'
import { useAppSidebar } from '~/composables/useAppSidebar'
import WbsModule from '~/components/sidebar/modules/WbsModule.vue'
import { formatCurrency, formatNumber } from '~/lib/formatters'

import ImportWizard from '~/components/projects/ImportWizard.vue'

definePageMeta({
  disableDefaultSidebar: true,
})


const route = useRoute()
const router = useRouter()
const projectId = route.params.id as string
const estimateId = route.params.estimateId as string
const _colorMode = useColorMode()
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

type OfferEntry = {
  codice?: string | null;
  descrizione?: string | null;
  wbs6_code?: string | null;
  wbs6_description?: string | null;
  wbs7_code?: string | null;
  wbs7_description?: string | null;
  prezzo_progetto?: number | null;
  quantita_progetto?: number | null;
  importo_progetto?: number | null;
  media_prezzi?: number | null;
  minimo_prezzi?: number | null;
  massimo_prezzi?: number | null;
  offerte: Record<string, {
    codice?: string | null;
    descrizione?: string | null;
    quantita?: number | null;
    prezzo_unitario?: number | null;
    importo_totale?: number | null;
    delta_media?: number | null;
  }>;
};

interface ComparisonResponse {
  voci: OfferEntry[]
  imprese: { nome: string; round_number?: number; round_label?: string }[]
  rounds: { numero: number; label: string }[]
  all_rounds: { numero: number; label: string }[]
  all_imprese: { nome: string }[]
}

const { data: comparison, status, refresh } = await useFetch<ComparisonResponse>(apiUrl, {
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


const { wbsNodes, selectedWbsNode, filteredRowData: filteredRows, onWbsNodeSelected } = useWbsTree(rows, {
  getLevels: (item: OfferEntry) => {
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

const totalItems = computed(() => filteredRows.value.length)

const wbsButtonTitle = computed(() => {
  return sidebarVisible.value ? 'Nascondi WBS' : 'Mostra WBS'
})

// Toggled by button in header

const { registerModule, unregisterModule, toggleVisibility, isVisible: sidebarVisible, setActiveModule, showSidebar } = useSidebarModules()
const { showDefaultSidebar } = useAppSidebar()

onMounted(() => {
  registerModule({
    id: 'wbs',
    label: 'WBS',
    icon: 'heroicons:squares-2x2',
    component: WbsModule,
    props: {
      nodes: wbsNodes,
      selectedNodeId: computed(() => selectedWbsNode.value?.id ?? null),
      onNodeSelected: (node: typeof selectedWbsNode.value | null) => onWbsNodeSelected(node),
    },
  })
  setActiveModule('wbs')
})

onUnmounted(() => {
  unregisterModule('wbs')
})

const toggleWbsSidebar = () => {
  if (!sidebarVisible.value) {
    setActiveModule('wbs')
    showSidebar()
  } else {
    toggleVisibility()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────
const fmtNumber = (v: number | string | null | undefined) =>
  formatNumber(Number(v) || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2, fallback: '0' })

const fmtCurrency = (v: number | string | null | undefined) =>
  formatCurrency(Number(v) || 0)

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
        valueFormatter: ({ value }: { value: number | null }) => fmtNumber(value),
      },
      {
        field: 'prezzo_unitario_progetto',
        headerName: 'P.U.',
        width: 110,
        type: 'numericColumn',
        valueFormatter: ({ value }: { value: number | null }) => fmtCurrency(value),
        cellStyle: { fontWeight: '600' },
      },
      {
        field: 'importo_totale_progetto',
        headerName: 'Importo',
        width: 130,
        type: 'numericColumn',
        valueFormatter: ({ value }: { value: number | null }) => fmtCurrency(value),
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
        valueFormatter: ({ value }: { value: number | null }) => (value != null ? fmtCurrency(value) : '-'),
        cellStyle: { fontStyle: 'italic', backgroundColor: 'rgba(0,0,0,0.02)' },
      },
      {
        field: 'minimo_prezzi',
        headerName: 'Min',
        width: 100,
        type: 'numericColumn',
        valueFormatter: ({ value }: { value: number | null }) => (value != null ? fmtCurrency(value) : '-'),
        cellStyle: { color: '#22c55e', fontWeight: '500' },
      },
      {
        field: 'massimo_prezzi',
        headerName: 'Max',
        width: 100,
        type: 'numericColumn',
        valueFormatter: ({ value }: { value: number | null }) => (value != null ? fmtCurrency(value) : '-'),
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
        valueFormatter: ({ value }: { value: number | null }) => (value != null ? fmtNumber(value) : '-'),
        cellStyle: { backgroundColor: color?.bg },
      },
        // NEW/FIX: Add Delta Quantity Column
        {
          field: `offerte.${key}.delta_quantita`,
          headerName: 'Δ Q.tà',
          width: 90,
          type: 'numericColumn',
          filter: 'number',
          valueFormatter: ({ value }: { value: number | null }) =>
            value != null && Math.abs(value) >= 0.01 ? `${value > 0 ? '+' : ''}${fmtNumber(value)}` : '-',
          cellStyle: (params: { value: number | null }) => ({
            backgroundColor: color?.bg,
            // Reuse delta style logic which applies red/green based on value
            ...getDeltaStyle(params.value ?? 0),
          }),
        },
        {
          field: `offerte.${key}.prezzo_unitario`,
          headerName: 'Prezzo',
          width: 110,
          type: 'numericColumn',
          filter: 'number',
          valueFormatter: ({ value }: { value: number | null }) => (value != null ? fmtCurrency(value) : '-'),
          cellStyle: { backgroundColor: color?.bg },
        },
        // NEW: Delta Unit Price vs Mean
        {
          field: `offerte.${key}.delta_prezzo_media`,
          headerName: 'Δ Media',
          width: 100,
          type: 'numericColumn',
          filter: 'number',
          valueGetter: (params: { data?: OfferEntry }) => {
             try {
                const data = params.data;
                const price = data.offerte?.[key]?.prezzo_unitario;
                const mean = data.media_prezzi;
                if (price != null && mean != null) {
                  return price - mean;
                }
                return null;
             } catch { return null }
          },
          valueFormatter: ({ value }: { value: number | null }) =>
            value != null && Math.abs(value) >= 0.01 ? `${value > 0 ? '+' : ''}${fmtCurrency(value)}` : '-',
          cellStyle: (params: { value: number | null }) => ({
            backgroundColor: color?.bg,
            ...getDeltaStyle(params.value ?? 0),
          }),
        },
        // NEW: Delta Unit Price vs Project
        {
          field: `offerte.${key}.delta_prezzo_progetto`,
          headerName: 'Δ P.U.',
          width: 100,
          type: 'numericColumn',
          filter: 'number',
          valueGetter: (params: { data?: OfferEntry }) => {
            const data = params.data;
            const price = data.offerte?.[key]?.prezzo_unitario;
            const projPrice = data.prezzo_unitario_progetto;
            if (price != null && projPrice != null) {
              return price - projPrice;
            }
            return null;
          },
          valueFormatter: ({ value }: { value: number | null }) =>
            value != null && Math.abs(value) >= 0.01 ? `${value > 0 ? '+' : ''}${fmtCurrency(value)}` : '-',
          cellStyle: (params: { value: number | null }) => ({
            backgroundColor: color?.bg,
            ...getDeltaStyle(params.value ?? 0),
          }),
        },
        {
          field: `offerte.${key}.importo_totale`,
          headerName: 'Importo',
          width: 120,
          type: 'numericColumn',
          filter: 'number',
          valueFormatter: ({ value }: { value: number | null }) => (value != null ? fmtCurrency(value) : '-'),
          cellStyle: { backgroundColor: color?.bg },
        },
        // NEW: Delta Total Amount vs Project
        {
          field: `offerte.${key}.delta_importo_progetto`,
          headerName: 'Δ Imp.',
          width: 120,
          type: 'numericColumn',
          filter: 'number',
          valueGetter: (params: { data?: OfferEntry }) => {
            const data = params.data;
            const amount = data.offerte?.[key]?.importo_totale;
            const projAmount = data.importo_totale_progetto;
            if (amount != null && projAmount != null) {
              return amount - projAmount;
            }
            return null;
          },
          valueFormatter: ({ value }: { value: number | null }) =>
            value != null && Math.abs(value) >= 0.01 ? `${value > 0 ? '+' : ''}${fmtCurrency(value)}` : '-',
          cellStyle: (params: { value: number | null }) => ({
            backgroundColor: color?.bg,
            borderRight: `2px solid ${color?.border}`,
            ...getDeltaStyle(params.value ?? 0),
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

// Toolbar State
const searchText = ref('')

// Import Logic
const isImportModalOpen = ref(false)
const handleImportSuccess = async () => {
  isImportModalOpen.value = false
  await refresh()
}
</script>

<template>
  <div class="h-full flex flex-col">
    <DataGridPage
      title="Confronto Offerte"
      subtitle="Round e Imprese"
      :grid-config="gridConfig"
      :row-data="filteredRows"
      :loading="isLoading"
      empty-state-title="Nessuna voce"
      empty-state-message="Carica un ritorno di gara per vedere il confronto."
      
      :show-toolbar="false"
      :filter-text="searchText"
    >
      <!-- Meta: Item Count -->
      <template #header-meta>
         <div class="flex items-center gap-2">
           <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
              <Icon name="heroicons:list-bullet" class="w-3.5 h-3.5" />
              {{ totalItems }} voci
           </span>
         </div>
      </template>
      <template #actions>
        <UButton
          color="primary"
          variant="solid"
          icon="i-heroicons-arrow-up-tray"
          size="sm"
          @click="isImportModalOpen = true"
        >
          Importa Offerta
        </UButton>
        <UButton
          :icon="sidebarVisible ? 'i-heroicons-view-columns' : 'i-heroicons-view-columns'"
          :color="sidebarVisible ? 'primary' : 'neutral'"
          variant="ghost"
          size="sm"
          :title="wbsButtonTitle"
          label="WBS"
          @click="toggleWbsSidebar"
        />
      </template>

      <!-- Toolbar Slot -->
      <template #pre-grid>
        <ClientOnly>
          <Teleport to="#topbar-actions-portal">
        <PageToolbar
            v-model="searchText"
            search-placeholder="Cerca voce..."
            class="!py-0"
          >
            <!-- Left: Search + Active Filters -->
            <template #left>
               <div v-if="selectedRound || selectedCompany || selectedWbsNode" class="flex items-center gap-2 ml-4">
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

            <!-- Right: Action Toggles (Filters) -->
            <template #right>
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
                    <p class="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-2 px-2">Seleziona Round</p>
                    <div class="space-y-1">
                      <button
                        class="filter-menu-item"
                        :class="{ 'filter-menu-item--active': !selectedRound }"
                        @click="selectedRound = null"
                      >
                        <UIcon v-if="!selectedRound" name="i-heroicons-check" class="w-4 h-4" />
                        <span :class="{ 'ml-6': selectedRound }">Tutti i round</span>
                      </button>
                      <button
                        v-for="r in roundOptions"
                        :key="r.numero"
                        class="filter-menu-item"
                        :class="{ 'filter-menu-item--active': selectedRound === String(r.numero) }"
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
                    <p class="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-2 px-2">Seleziona Impresa</p>
                    <div class="space-y-1">
                      <button
                        class="filter-menu-item"
                        :class="{ 'filter-menu-item--active': !selectedCompany }"
                        @click="selectedCompany = null"
                      >
                        <UIcon v-if="!selectedCompany" name="i-heroicons-check" class="w-4 h-4" />
                        <span :class="{ 'ml-6': selectedCompany }">Tutte le imprese</span>
                      </button>
                      <button
                        v-for="c in companyOptions"
                        :key="c.nome"
                        class="filter-menu-item"
                        :class="{ 'filter-menu-item--active': selectedCompany === c.nome }"
                        @click="selectedCompany = c.nome"
                      >
                        <UIcon v-if="selectedCompany === c.nome" name="i-heroicons-check" class="w-4 h-4" />
                        <span :class="{ 'ml-6': selectedCompany !== c.nome }">{{ c.nome }}</span>
                      </button>
                    </div>
                  </div>
                </template>
              </UPopover>
            </template>
        </PageToolbar>
          </Teleport>
        </ClientOnly>
      </template>

    </DataGridPage>

    <Teleport to="body">
      <!-- Import Wizard Modal -->
      <div v-if="isImportModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6">
        <div 
          class="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm transition-opacity"
          @click="isImportModalOpen = false"
        />
        <div class="relative z-[105] w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl overflow-hidden bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex flex-col">
           <ImportWizard 
             :project-id="projectId"
             :estimate-id="estimateId"
             @success="handleImportSuccess"
             @close="isImportModalOpen = false"
           />
        </div>
      </div>
    </Teleport>
  </div>
</template>
