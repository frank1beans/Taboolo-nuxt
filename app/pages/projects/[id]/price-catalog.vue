<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useFiltersStore } from '@/stores/filters'
import { useOffersComparison } from '@/composables/queries/useAnalysisQueries'
import { useWbsTree } from '@/composables/queries/useWbsQueries'
import { useEstimates } from '@/composables/queries/useEstimateQueries'
import type { ColDef, ValueFormatterParams, ValueGetterParams } from 'ag-grid-community'

definePageMeta({
  alias: ['/commesse/:id/elenco-prezzi'],
})

const route = useRoute()
const projectId = computed(() => String(route.params.id))
const filtersStore = useFiltersStore()

// Load filters from localStorage on mount
onMounted(() => {
  filtersStore.loadFromLocalStorage(projectId.value)
})

// Save filters when they change
watch(
  () => filtersStore.$state,
  () => {
    filtersStore.saveToLocalStorage(projectId.value)
  },
  { deep: true }
)

// Data queries
const { data: wbsTree, isLoading: isLoadingWbs } = useWbsTree(projectId)
const { data: estimates } = useEstimates(projectId)

// Comparison data with filters
const comparisonParams = computed(() => ({
  baseline_estimate_id: filtersStore.selectedRevision || undefined,
  discipline: filtersStore.selectedDiscipline || undefined,
}))

const { data: comparisonData, isLoading: isLoadingComparison } = useOffersComparison(
  projectId,
  comparisonParams
)

// Sidebar state
const sidebarOpen = ref(false)

// Filter by Round
const availableRounds = computed(() => comparisonData.value?.rounds || [])
const selectedRoundNumber = computed({
  get: () => filtersStore.selectedRound,
  set: (val) => filtersStore.setRoundFilter(val),
})

// Filter by Company
const availableCompanies = computed(() => {
  if (!comparisonData.value?.companies) return []
  return comparisonData.value.companies.map((c) => c.name)
})

const selectedCompanyName = computed({
  get: () => filtersStore.selectedCompany,
  set: (val) => filtersStore.setCompanyFilter(val),
})

// Filtered data
const filteredItems = computed(() => {
  if (!comparisonData.value?.items) return []

  let items = [...comparisonData.value.items]

  // Filter by WBS
  if (filtersStore.selectedWbsNode) {
    const wbsCode = filtersStore.selectedWbsNode.code
    items = items.filter((item) => {
      const itemWbs = item.wbs6_code || item.wbs7_code || ''
      return itemWbs === wbsCode || itemWbs.startsWith(wbsCode + '.')
    })
  }

  // Filter by Round (filter offers by round)
  if (filtersStore.selectedRound !== null) {
    items = items.map((item) => {
      const filteredOffers: typeof item.offers = {}

      Object.entries(item.offers).forEach(([company, offer]) => {
        const companyData = comparisonData.value?.companies.find((c) => c.name === company)
        if (companyData && companyData.round_number === filtersStore.selectedRound) {
          filteredOffers[company] = offer
        }
      })

      return { ...item, offers: filteredOffers }
    })
  }

  // Filter by Company
  if (filtersStore.selectedCompany) {
    items = items.map((item) => {
      const filteredOffers: typeof item.offers = {}
      if (item.offers[filtersStore.selectedCompany!]) {
        filteredOffers[filtersStore.selectedCompany!] = item.offers[filtersStore.selectedCompany!]
      }
      return { ...item, offers: filteredOffers }
    })
  }

  return items
})

// Dynamic columns for companies
const companyColumns = computed(() => {
  if (!comparisonData.value?.companies) return []

  let companies = [...comparisonData.value.companies]

  // Filter by round/company if selected
  if (filtersStore.selectedRound !== null) {
    companies = companies.filter((c) => c.round_number === filtersStore.selectedRound)
  }
  if (filtersStore.selectedCompany) {
    companies = companies.filter((c) => c.name === filtersStore.selectedCompany)
  }

  return companies.map((company) => ({
    headerName: company.label || company.name,
    headerClass: 'bg-primary/5',
    children: [
      {
        headerName: 'Qtà',
        field: `offers.${company.name}.quantity`,
        width: 90,
        valueGetter: (params: ValueGetterParams) => {
          const offers = params.data?.offers
          return offers?.[company.name]?.quantity || null
        },
        valueFormatter: (params: ValueFormatterParams) =>
          params.value != null ? params.value.toLocaleString('it-IT') : '—',
        cellClass: 'text-right font-mono text-sm',
      },
      {
        headerName: 'Prezzo',
        field: `offers.${company.name}.unit_price`,
        width: 110,
        valueGetter: (params: ValueGetterParams) => {
          const offers = params.data?.offers
          return offers?.[company.name]?.unit_price || null
        },
        valueFormatter: (params: ValueFormatterParams) =>
          params.value != null
            ? `€ ${params.value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
            : '—',
        cellClass: 'text-right font-mono text-sm',
      },
      {
        headerName: 'Totale',
        field: `offers.${company.name}.total_amount`,
        width: 130,
        valueGetter: (params: ValueGetterParams) => {
          const offers = params.data?.offers
          return offers?.[company.name]?.total_amount || null
        },
        valueFormatter: (params: ValueFormatterParams) =>
          params.value != null
            ? `€ ${params.value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
            : '—',
        cellClass: 'text-right font-mono text-sm font-semibold',
      },
    ],
  }))
})

// Column definitions
const columnDefs = computed<ColDef[]>(() => [
  {
    headerName: '#',
    field: 'progressive',
    width: 70,
    pinned: 'left',
    cellClass: 'text-muted-foreground text-xs',
  },
  {
    headerName: 'Codice',
    field: 'code',
    width: 130,
    pinned: 'left',
    cellClass: 'font-mono text-xs font-semibold',
  },
  {
    headerName: 'Descrizione',
    field: 'description',
    flex: 1,
    minWidth: 300,
    pinned: 'left',
    cellClass: 'text-sm',
  },
  {
    headerName: 'UM',
    field: 'unit_measure',
    width: 70,
    cellClass: 'text-xs text-center',
  },
  {
    headerName: 'Progetto',
    headerClass: 'bg-secondary/30',
    children: [
      {
        headerName: 'Qtà',
        field: 'quantity',
        width: 90,
        valueFormatter: (params: ValueFormatterParams) =>
          params.value != null ? params.value.toLocaleString('it-IT') : '—',
        cellClass: 'text-right font-mono text-sm',
      },
      {
        headerName: 'Prezzo',
        field: 'project_unit_price',
        width: 110,
        valueFormatter: (params: ValueFormatterParams) =>
          params.value != null
            ? `€ ${params.value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
            : '—',
        cellClass: 'text-right font-mono text-sm',
      },
      {
        headerName: 'Totale',
        field: 'project_total_amount',
        width: 130,
        valueFormatter: (params: ValueFormatterParams) =>
          params.value != null
            ? `€ ${params.value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
            : '—',
        cellClass: 'text-right font-mono text-sm font-semibold',
      },
    ],
  },
  ...companyColumns.value,
])

// Clear filters
const handleClearFilters = () => {
  filtersStore.clearAllFilters()
}
</script>

<template>
  <!-- Hidden element to force Tailwind to include classes used in JS -->
  <div class="hidden text-sm text-xs text-right text-center text-muted-foreground font-mono font-semibold" />

  <div class="flex h-[calc(100vh-4rem)] gap-0">
    <!-- WBS Sidebar (Slideover) -->
    <FilterSidebar
      v-model:open="sidebarOpen"
      title="Filtri WBS"
      description="Seleziona un nodo per filtrare i dati"
    >
      <WbsSidebar
        v-if="wbsTree"
        :nodes="wbsTree"
        :selected-node-id="filtersStore.selectedWbsNodeId"
        @node-select="(node) => filtersStore.setWbsFilter(node?.id || null, node)"
      />
      <div v-else class="p-4 text-center text-sm text-muted-foreground">
        <UIcon name="i-lucide-loader-2" class="mx-auto h-6 w-6 animate-spin mb-2" />
        Caricamento WBS...
      </div>
    </FilterSidebar>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="p-6 border-b border-border bg-card">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Progetto</p>
            <h1 class="text-3xl font-bold tracking-tight">Elenco Prezzi</h1>
            <p class="text-muted-foreground mt-1">
              Confronto prezzi e quantità tra progetto e offerte
            </p>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              variant="outline"
              @click="sidebarOpen = true"
            >
              <UIcon name="i-lucide-filter" class="mr-2 h-4 w-4" />
              Filtri WBS
              <UBadge v-if="filtersStore.activeFiltersCount > 0" size="xs" color="primary" class="ml-2">
                {{ filtersStore.activeFiltersCount }}
              </UBadge>
            </UButton>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="flex items-center gap-3 mt-4">
          <!-- Round Filter -->
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-muted-foreground">Round:</label>
            <USelect
              v-model="selectedRoundNumber"
              :options="[
                { label: 'Tutti i round', value: null },
                ...availableRounds.map((r) => ({
                  label: r.label || `Round ${r.number}`,
                  value: r.number,
                })),
              ]"
              option-attribute="label"
              value-attribute="value"
              size="sm"
              class="w-48"
            />
          </div>

          <!-- Company Filter -->
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-muted-foreground">Impresa:</label>
            <USelect
              v-model="selectedCompanyName"
              :options="[
                { label: 'Tutte le imprese', value: null },
                ...availableCompanies.map((c) => ({ label: c, value: c })),
              ]"
              option-attribute="label"
              value-attribute="value"
              size="sm"
              class="w-48"
            />
          </div>

          <!-- Clear All -->
          <UButton
            v-if="filtersStore.hasActiveFilters"
            size="sm"
            variant="ghost"
            color="gray"
            @click="handleClearFilters"
          >
            <UIcon name="i-lucide-x-circle" class="mr-1 h-3 w-3" />
            Cancella filtri
          </UButton>
        </div>
      </div>

      <!-- Table -->
      <div class="flex-1 overflow-hidden p-6">
        <EnhancedDataTable
          :data="filteredItems"
          :column-defs="columnDefs"
          :is-loading="isLoadingComparison"
          :enable-floating-filters="true"
          :description="`${filteredItems.length} voci`"
          height="100%"
          persist-key="price-catalog"
        >
          <template #footer>
            <div class="text-sm text-muted-foreground">
              Totale voci: <strong>{{ filteredItems.length }}</strong>
            </div>
          </template>
        </EnhancedDataTable>
      </div>
    </div>
  </div>
</template>

