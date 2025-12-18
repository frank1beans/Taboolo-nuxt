<script setup lang="ts">
import { useRoute } from 'vue-router';
import { computed, onMounted, ref, watch } from 'vue';
import type { DataGridConfig } from '~/types/data-grid';
import { useCurrentContext } from '~/composables/useCurrentContext';

const route = useRoute();
const projectId = route.params.id as string;

import type { Project } from '~/types/project';

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

const formatCurrency = (value?: number | null) => {
  const safe = typeof value === 'number' ? value : 0;
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(safe);
};

const formatDeltaPerc = (value?: number | null) => {
  if (value === null || value === undefined) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

const fetchStatsForEstimates = async () => {
  if (!process.client || !estimates.value.length) return;
  statsLoading.value = true;
  const entries = await Promise.all(
    estimates.value.map(async (est) => {
      try {
        const stats = await $fetch<{ project_total: number; offers: any }>(`/api/projects/${projectId}/analytics/stats`, {
          params: { estimate_id: est.id },
        });
        const projectTotal = stats?.project_total || 0;
        const offers = stats?.offers?.per_company_round || [];
        const latestRound = stats?.offers?.latest_round ?? offers.reduce((max: number, o: any) => Math.max(max, o.round_number || 0), 0);
        const latestOffers = offers.filter((o: any) => (o.round_number || 0) === latestRound);
        const best = latestOffers.reduce(
          (acc: any, cur: any) => {
            if (cur.total_amount === undefined || cur.total_amount === null) return acc;
            if (!acc || cur.total_amount < acc.total_amount) return cur;
            return acc;
          },
          latestOffers[0] || null,
        );
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
      valueFormatter: (params: any) => formatCurrency(params.value),
    },
    {
      field: 'bestOffer',
      headerName: 'Migliore offerta (ultimo round)',
      width: 200,
      cellClass: 'ag-right-aligned-cell',
      valueFormatter: (params: any) => formatCurrency(params.value),
    },
    {
      field: 'deltaPerc',
      headerName: 'Delta vs progetto',
      width: 150,
      cellClass: 'ag-right-aligned-cell',
      valueFormatter: (params: any) => formatDeltaPerc(params.value),
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
    'font-bold bg-[hsl(var(--primary)/0.05)]': (params: any) => params.data && params.data.id === activeEstimateId.value,
  },
};

const navigateToEstimate = (estimate: any) => {
  if (!estimate?.id) return
  navigateTo(`/projects/${projectId}/estimate/${estimate.id}`);
};

const deleteEstimate = async (estimate: any) => {
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

const gridRows = computed(() => {
  return estimates.value.map((est) => {
    const stats = statsMap.value[est.id] || {};
    return {
      ...est,
      bestOffer: stats.bestOffer ?? null,
      deltaPerc: stats.deltaPerc ?? null,
    };
  });
});

const activeEstimateStats = computed(() => {
  if (!activeEstimateId.value) return null;
  return statsMap.value[activeEstimateId.value] || null;
});

const links = computed(() => [
  { label: 'Home', to: '/' },
  { label: 'Progetti', to: '/projects' },
  { label: project.value?.name || 'Dettaglio Progetto', to: route.path },
]);
</script>

<template>
  <div class="space-y-4">
    <UCard class="border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <template #header>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide font-medium text-[hsl(var(--muted-foreground))]">
              Preventivi
            </p>
            <h1 class="text-lg font-semibold text-[hsl(var(--foreground))]">
              {{ project?.name || 'Dettaglio Progetto' }}
            </h1>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UBadge v-if="estimates.length > 0" color="neutral" variant="soft">
              <Icon name="heroicons:document-text" class="w-3.5 h-3.5 mr-1" />
              {{ estimates.length }} {{ estimates.length === 1 ? 'preventivo' : 'preventivi' }}
            </UBadge>
            <div v-if="activeEstimateStats?.bestOffer" class="flex items-center gap-2 text-sm">
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
          </div>
        </div>
      </template>


      <DataGrid
        :config="gridConfig"
        :row-data="gridRows"
        :loading="loading || statsLoading"
        height="calc(100vh - 240px)"
        toolbar-placeholder="Cerca preventivo..."
        export-filename="preventivi"
        empty-state-title="Nessun preventivo"
        empty-state-message="Non ci sono preventivi associati a questo progetto."
        @row-dblclick="(params) => navigateToEstimate(params)"
      />
    </UCard>
  </div>
</template>
