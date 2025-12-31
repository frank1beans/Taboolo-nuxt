<script setup lang="ts">
import { useRoute } from 'vue-router';
import type { GridApi, GridReadyEvent } from 'ag-grid-community';
import { computed, onMounted, ref, watch } from 'vue';
import type { DataGridConfig } from '~/types/data-grid';
import { useCurrentContext } from '~/composables/useCurrentContext';
import DataGridActions from '~/components/data-grid/DataGridActions.vue';
import DataGridPage from '~/components/layout/DataGridPage.vue';
import PageToolbar from '~/components/layout/PageToolbar.vue';
import type { ApiOfferSummary } from '~/types/api';
import type { Estimate, Project } from '#types';
import { formatCurrency as formatCurrencyLib, formatDelta } from '~/lib/formatters';

const route = useRoute();
const projectId = route.params.id as string;

// Explicitly type the useFetch result or cast it
const { data: context, status, refresh } = await useFetch<Project>(`/api/projects/${projectId}/context`, {
    key: `project-context-dashboard-${projectId}`
});

const { data: alertSummary, status: alertStatus, refresh: refreshAlertSummary } = await useFetch(
  `/api/projects/${projectId}/offers/alerts/summary`,
  {
    key: `project-${projectId}-alert-summary`,
    query: { group_by: 'estimate', status: 'open' },
  },
);

const loading = computed(() => status.value === 'pending');
const project = computed(() => context.value);

// Safely access estimates with optional chaining and type assertion if needed
const estimates = computed(() => project.value?.estimates || []);

const { setProjectState, currentEstimate } = useCurrentContext();
const activeEstimateId = computed(() => currentEstimate.value?.id);

type EstimateRow = Estimate & {
  bestOffer: number | null;
  deltaPerc: number | null;
  alertCount?: number;
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
const alertsLoading = computed(() => alertStatus.value === 'pending');

const alertSummaryItems = computed(() => alertSummary.value?.items || []);
const alertSummaryTotal = computed(() => alertSummary.value?.total ?? 0);
const alertSummaryMap = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {};
  alertSummaryItems.value.forEach((item: { estimate_id?: string; total?: number }) => {
    if (item.estimate_id) {
      map[item.estimate_id] = Number(item.total || 0);
    }
  });
  return map;
});

const formatCurrency = (value?: number | null) => formatCurrencyLib(value ?? 0);
const formatDeltaPerc = (value?: number | null) => (value === null || value === undefined ? '-' : formatDelta(value));

const fetchStatsForEstimates = async () => {
  if (!import.meta.client || !estimates.value.length) return;
  statsLoading.value = true;
  try {
    const offersResponse = await $fetch<{ offers: ApiOfferSummary[] }>(`/api/projects/${projectId}/offers`);
    const offers = offersResponse?.offers ?? [];
    const offersByEstimate = new Map<string, ApiOfferSummary[]>();

    offers.forEach((offer) => {
      const estimateId = offer.estimate_id;
      if (!estimateId) return;
      const list = offersByEstimate.get(estimateId);
      if (list) {
        list.push(offer);
      } else {
        offersByEstimate.set(estimateId, [offer]);
      }
    });

    const entries = estimates.value.map((est) => {
      const list = offersByEstimate.get(est.id) ?? [];
      const projectTotal = Number(est.total_amount ?? 0);
      const latestRound = list.length
        ? list.reduce((max, offer) => Math.max(max, offer.round_number ?? 1), 0)
        : null;
      const latestOffers = latestRound === null
        ? []
        : list.filter((offer) => (offer.round_number ?? 1) === latestRound);

      let bestOffer: ApiOfferSummary | null = null;
      let bestAmount: number | null = null;

      for (const offer of latestOffers) {
        const amount = typeof offer.total_amount === 'number' ? offer.total_amount : 0;
        if (bestAmount === null || amount < bestAmount) {
          bestAmount = amount;
          bestOffer = offer;
        }
      }

      const bestValue = bestAmount !== null ? bestAmount : null;
      const deltaAbs = bestValue !== null ? bestValue - projectTotal : null;
      const deltaPerc = bestValue !== null && projectTotal && deltaAbs !== null ? (deltaAbs / projectTotal) * 100 : null;

      return [
        est.id,
        {
          bestOffer: bestValue,
          bestCompany: bestOffer?.company_name || null,
          bestRound: latestRound,
          deltaAbs,
          deltaPerc,
        },
      ];
    });

    statsMap.value = Object.fromEntries(entries);
  } catch (e) {
    console.error('Failed to fetch offers for stats', e);
    statsMap.value = {};
  } finally {
    statsLoading.value = false;
  }
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
      field: 'total_amount',
      headerName: 'Totale progetto',
      width: 150,
      cellClass: 'ag-right-aligned-cell font-bold',
      valueFormatter: (params: any) => formatCurrency(typeof params.value === 'number' ? params.value : Number(params.value ?? 0)),
    },
    {
      field: 'bestOffer',
      headerName: 'Migliore offerta (ultimo round)',
      width: 200,
      cellClass: 'ag-right-aligned-cell',
      valueFormatter: (params: any) => formatCurrency(typeof params.value === 'number' ? params.value : Number(params.value ?? 0)),
    },
    {
      field: 'deltaPerc',
      headerName: 'Delta vs progetto',
      width: 150,
      cellClass: 'ag-right-aligned-cell',
      valueFormatter: (params: any) => formatDeltaPerc(typeof params.value === 'number' ? params.value : Number(params.value ?? 0)),
    },
    {
      field: 'alertCount',
      headerName: 'Alert',
      width: 110,
      cellClass: 'ag-right-aligned-cell',
      cellRenderer: ((params: { value?: number }) => {
        const count = Number(params.value || 0);
        if (!count) return '-';
        return `<span class="stat-pill stat-pill--warning">${count}</span>`;
      }) as any,
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
  if (!estimate?.id) return;
  
  if (!confirm(`Sei sicuro di voler eliminare il preventivo "${estimate.name}"? Questa azione è irreversibile.`)) {
    return;
  }
  
  try {
    await $fetch(`/api/projects/${projectId}/estimates/${estimate.id}`, {
      method: 'DELETE',
    });
    // Refresh data
    await refresh(); // assuming refresh function is available from useFetch result
    await refreshAlertSummary();
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
      alertCount: alertSummaryMap.value[est.id] ?? 0,
    };
  }),
);

const activeEstimateStats = computed(() => {
  if (!activeEstimateId.value) return null;
  return statsMap.value[activeEstimateId.value] || null;
});

const navigateToPricelist = (estimate?: Estimate) => {
  if (!estimate?.id) return;
  navigateTo(`/projects/${projectId}/pricelist?estimateId=${estimate.id}`);
};

const resolveConflicts = (estimate?: Estimate) => {
  if (!estimate?.id) return;
  navigateTo(`/projects/${projectId}/conflicts?estimateId=${estimate.id}`);
};

const gridContext = computed(() => ({
  rowActions: {
    open: (row?: Estimate) => navigateToEstimate(row),
    viewPricelist: (row?: Estimate) => navigateToPricelist(row),
    resolve: (row?: Estimate) => resolveConflicts(row),
    remove: (row?: Estimate) => deleteEstimate(row),
  },
  hasAlerts: (row?: Estimate) => (alertSummaryMap.value[row?.id || ''] || 0) > 0,
}));

// Toolbar Props & Methods
const searchText = ref('');
const gridApi = ref<GridApi | null>(null);
const { exportToXlsx } = useDataGridExport(gridApi);

const onGridReady = (params: any) => {
  gridApi.value = params.api;
};

const handleReset = () => {
    searchText.value = '';
    gridApi.value?.setFilterModel(null);
};

const handleExport = () => {
    exportToXlsx('preventivi');
};
</script>

<template>
  <DataGridPage
    title="Preventivi"
    :grid-config="gridConfig"
    :row-data="gridRows as any[]"
    :loading="loading || statsLoading || alertsLoading"
    
    :show-toolbar="false"
    :filter-text="searchText"

    empty-state-title="Nessun preventivo"
    empty-state-message="Non ci sono preventivi associati a questo progetto."
    :custom-components="{ actionsRenderer: DataGridActions }"
    :context-extras="gridContext"
    @row-dblclick="(params: any) => navigateToEstimate(params?.data)"
    @grid-ready="(params: any) => onGridReady(params)"
  >
    <template #header-meta>
       <div class="flex items-center gap-2">
         <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
            Progetto: {{ project?.name || '...' }}
         </span>
         <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
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
      <!-- Import button moved to Topbar -->
    </template>

    <!-- Toolbar Slot -->
    <template #pre-grid>
        <!-- Alerts moved to bottom bar -->
        <ClientOnly>
          <Teleport to="#app-bottombar-right">
            <div v-if="alertSummaryTotal > 0" class="flex items-center gap-4 text-xs">
              <div class="flex items-center gap-2 text-amber-500 font-medium animate-pulse">
                <Icon name="heroicons:exclamation-triangle" class="w-4 h-4" />
                <span>{{ alertSummaryTotal }} Alert da risolvere</span>
              </div>
              <div class="h-4 w-px bg-[hsl(var(--border))]" />
              <UButton
                size="xs"
                color="neutral"
                variant="solid"
                label="Risoluzione Alert"
                icon="i-heroicons-wrench-screwdriver"
                :to="`/projects/${projectId}/conflicts`"
              />
            </div>
          </Teleport>
        </ClientOnly>

        <ClientOnly>
          <Teleport to="#topbar-actions-portal">
            <PageToolbar
              v-model="searchText"
              search-placeholder="Cerca preventivo..."
              class="!py-0"
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

            <UButton
               color="neutral"
               variant="ghost"
               icon="i-heroicons-arrow-down-tray"
               class="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
               @click="handleExport"
            >
               Esporta
            </UButton>

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-arrow-up-tray"
              class="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              @click="navigateTo(`/projects/${projectId}/import`)"
            >
              Importa Dati
            </UButton>
          </template>
            </PageToolbar>
          </Teleport>
        </ClientOnly>
    </template>
  </DataGridPage>
</template>
