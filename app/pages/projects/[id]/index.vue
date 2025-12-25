<script setup lang="ts">
import { useRoute } from 'vue-router';
import { computed, onMounted, ref, watch } from 'vue';
import type { DataGridConfig } from '~/types/data-grid';
import { useCurrentContext } from '~/composables/useCurrentContext';
import DataGridActions from '~/components/data-grid/DataGridActions.vue';
import DataGridPage from '~/components/layout/DataGridPage.vue';
import PageToolbar from '~/components/layout/PageToolbar.vue';
import type { Estimate, Project } from '~/types/project';
import { formatCurrency as formatCurrencyLib, formatDelta } from '~/lib/formatters';

const route = useRoute();
const projectId = route.params.id as string;

// Explicitly type the useFetch result or cast it
const { data: context, status, refresh } = await useFetch<Project>(`/api/projects/${projectId}/context`, {
    key: `project-context-dashboard-${projectId}`
});

const loading = computed(() => status.value === 'pending');
const project = computed(() => context.value);

// Safely access estimates with optional chaining and type assertion if needed
const estimates = computed(() => project.value?.estimates || []);

const { setProjectState, currentEstimate } = useCurrentContext();
const activeEstimateId = computed(() => currentEstimate.value?.id);

interface OfferStats {
  round_number?: number | null;
  total_amount?: number | null;
  company?: string | null;
}

interface EstimateStatsResponse {
  project_total?: number | null;
  offers?: {
    per_company_round?: OfferStats[];
    latest_round?: number | null;
  };
}

type EstimateRow = Estimate & {
  bestOffer: number | null;
  deltaPerc: number | null;
};

// Enforce project context (clears active estimate) using direct hydration
onMounted(() => {
    if (context.value) {
        setProjectState(context.value, null);
    }
});

const statsMap = ref<Record<string, {
  bestOffer?: number | null;
  bestCompany?: string | null;
  bestRound?: number | null;
  deltaAbs?: number | null;
  deltaPerc?: number | null;
}>>({});
const statsLoading = ref(false);

const formatCurrency = (value?: number | null) => formatCurrencyLib(value ?? 0);
const formatDeltaPerc = (value?: number | null) => (value === null || value === undefined ? '-' : formatDelta(value));

const fetchStatsForEstimates = async () => {
  if (!import.meta.client || !estimates.value.length) return;
  statsLoading.value = true;
  const entries = await Promise.all(
    estimates.value.map(async (est) => {
      try {
        const stats = await $fetch<EstimateStatsResponse>(`/api/projects/${projectId}/analytics/stats`, {
          params: { estimate_id: est.id },
        });
        const projectTotal = stats?.project_total ?? 0;
        const offers = stats?.offers?.per_company_round ?? [];
        const latestRound = stats?.offers?.latest_round
          ?? offers.reduce((max, o) => Math.max(max, o.round_number ?? 0), 0);
        const latestOffers = offers.filter((o) => (o.round_number ?? 0) === latestRound);
        const best = latestOffers.reduce<OfferStats | null>((acc, cur) => {
          if (cur.total_amount === undefined || cur.total_amount === null) return acc;
          if (!acc || cur.total_amount < (acc.total_amount ?? Number.POSITIVE_INFINITY)) return cur;
          return acc;
        }, latestOffers[0] ?? null);
        const bestOffer = best?.total_amount ?? null;
        const deltaAbs = bestOffer !== null ? bestOffer - projectTotal : null;
        const deltaPerc = bestOffer !== null && projectTotal ? (deltaAbs / projectTotal) * 100 : null;

        return [
          est.id,
          {
            bestOffer,
            bestCompany: best?.company || null,
            bestRound: latestRound || null,
            deltaAbs,
            deltaPerc,
          },
        ];
      } catch (e) {
        console.error('Failed to fetch stats for estimate', est.id, e);
        return [est.id, {}];
      }
    }),
  );
  statsMap.value = Object.fromEntries(entries);
  statsLoading.value = false;
};

watch(estimates, () => {
  fetchStatsForEstimates();
}, { immediate: true });

const gridConfig: DataGridConfig = {
  columns: [
    {
      field: 'name',
      headerName: 'Nome Preventivo',
      flex: 2,
      minWidth: 200,
    },
    {
      field: 'roundsCount',
      headerName: 'Round',
      width: 100,
      cellClass: 'ag-right-aligned-cell',
    },
    {
      field: 'companiesCount',
      headerName: 'Imprese',
      width: 100,
      cellClass: 'ag-right-aligned-cell',
    },
    {
      field: 'totalAmount',
      headerName: 'Totale progetto',
      width: 150,
      cellClass: 'ag-right-aligned-cell font-bold',
      valueFormatter: (params: { value: unknown }) => formatCurrency(typeof params.value === 'number' ? params.value : Number(params.value ?? 0)),
    },
    {
      field: 'bestOffer',
      headerName: 'Migliore offerta (ultimo round)',
      width: 200,
      cellClass: 'ag-right-aligned-cell',
      valueFormatter: (params: { value: unknown }) => formatCurrency(typeof params.value === 'number' ? params.value : Number(params.value ?? 0)),
    },
    {
      field: 'deltaPerc',
      headerName: 'Delta vs progetto',
      width: 150,
      cellClass: 'ag-right-aligned-cell',
      valueFormatter: (params: { value: unknown }) => formatDeltaPerc(typeof params.value === 'number' ? params.value : Number(params.value ?? 0)),
    },
    {
      field: 'actions',
      headerName: 'Azioni',
      width: 120,
      cellRenderer: 'actionsRenderer',
      pinned: 'right',
      sortable: false,
      filter: false,
      suppressMenu: true,
      cellClass: 'no-border',
    },
  ],
  defaultColDef: {
    sortable: true,
    resizable: true,
  },
  enableQuickFilter: true,
  enableExport: true,
  headerHeight: 48,
  rowHeight: 44,
  rowClassRules: {
    'font-bold bg-[hsl(var(--primary)/0.05)]': (params: { data?: unknown }) => {
      const row = params.data as Estimate | undefined;
      return !!row && row.id === activeEstimateId.value;
    },
  },
};

const navigateToEstimate = (estimate?: Estimate) => {
  if (!estimate?.id) return;
  navigateTo(`/projects/${projectId}/estimate/${estimate.id}`);
};

const deleteEstimate = async (estimate?: Estimate) => {
  if (!confirm(`Sei sicuro di voler eliminare il preventivo "${estimate.name}"? Questa azione è irreversibile.`)) {
    return;
  }
  
  try {
    await $fetch(`/api/projects/${projectId}/estimates/${estimate.id}`, {
      method: 'DELETE',
    });
    // Refresh data
    await refresh(); // assuming refresh function is available from useFetch result
  } catch (error) {
    console.error('Error deleting estimate:', error);
    alert('Errore durante l\'eliminazione del preventivo.');
  }
};

const gridRows = computed<EstimateRow[]>(() =>
  estimates.value.map<EstimateRow>((est) => {
    const stats = statsMap.value[est.id] || {};
    return {
      ...est,
      bestOffer: stats.bestOffer ?? null,
      deltaPerc: stats.deltaPerc ?? null,
    };
  }),
);

const activeEstimateStats = computed(() => {
  if (!activeEstimateId.value) return null;
  return statsMap.value[activeEstimateId.value] || null;
});

const gridContext = computed(() => ({
  rowActions: {
    open: (row?: Estimate) => navigateToEstimate(row),
    remove: (row?: Estimate) => deleteEstimate(row),
  },
}));

// Toolbar Props & Methods
const searchText = ref('');
const gridApi = ref<any>(null);

const onGridReady = (params: any) => {
  gridApi.value = params.api;
};

const handleReset = () => {
    searchText.value = '';
    gridApi.value?.setFilterModel(null);
};

const handleExport = () => {
    gridApi.value?.exportDataAsExcel({ fileName: 'preventivi' });
};
</script>

<template>
  <DataGridPage
    title="Preventivi"
    :grid-config="gridConfig"
    :row-data="gridRows"
    :loading="loading || statsLoading"
    
    :show-toolbar="false"
    :filter-text="searchText"

    empty-state-title="Nessun preventivo"
    empty-state-message="Non ci sono preventivi associati a questo progetto."
    :custom-components="{ actionsRenderer: DataGridActions }"
    :context-extras="gridContext"
    @row-dblclick="(params) => navigateToEstimate(params?.data as Estimate | undefined)"
    @grid-ready="onGridReady"
  >
    <template #header-meta>
       <div class="flex items-center gap-2">
          <span class="text-[hsl(var(--foreground))] font-medium">
            Progetto: {{ project?.name || '...' }}
          </span>
          <span class="text-[hsl(var(--border))]">|</span>
          <span class="text-[hsl(var(--muted-foreground))]">
            {{ estimates.length }} {{ estimates.length === 1 ? 'preventivo' : 'preventivi' }}
          </span>
       </div>
    </template>

    <template #actions>
      <div v-if="activeEstimateStats?.bestOffer" class="flex items-center gap-2 text-sm mr-2">
        <span class="stat-pill">
          Migliore offerta: {{ formatCurrency(activeEstimateStats.bestOffer) }}
        </span>
        <span v-if="activeEstimateStats.deltaPerc !== null && activeEstimateStats.deltaPerc !== undefined" :class="['stat-pill', (activeEstimateStats.deltaPerc || 0) <= 0 ? 'stat-pill--success' : 'stat-pill--warning']">
          Delta: {{ formatDeltaPerc(activeEstimateStats.deltaPerc) }}
        </span>
      </div>
      <UButton 
        color="primary" 
        size="sm" 
        icon="i-heroicons-arrow-up-tray" 
        variant="solid"
        @click="navigateTo(`/projects/${projectId}/import`)"
      >
        Importa Dati
      </UButton>
    </template>

    <!-- Toolbar Slot -->
    <template #pre-grid>
        <PageToolbar
          v-model="searchText"
          search-placeholder="Cerca preventivo..."
        >
          <template #right>
            <button
               v-if="searchText"
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
  </DataGridPage>
</template>
