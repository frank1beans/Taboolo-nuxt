<script setup lang="ts">
import { useRoute } from 'vue-router';
import { computed, onMounted, ref } from 'vue';
import type { DataGridConfig } from '~/types/data-grid';
import { useCurrentContext } from '~/composables/useCurrentContext';

const route = useRoute();
const projectId = route.params.id as string;
const estimateId = route.params.estimateId as string;

// Use explicit key in useFetch to avoid conflicts
const { data: context, status, refresh } = await useFetch(`/api/projects/${projectId}/context`, {
    key: `project-context-${projectId}`
});

const { setCurrentEstimate } = useCurrentContext();

// Ensure context matches URL
onMounted(() => {
    console.log('Mounting Estimate Dashboard', estimateId);
    setCurrentEstimate(estimateId);
    loadStats();
});

const loading = computed(() => status.value === 'pending');
const project = computed(() => context.value);
const estimates = computed(() => context.value?.estimates || []);
const currentEstimate = computed(() => estimates.value.find((e: any) => e.id === estimateId));

const stats = ref<any | null>(null);
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

const loadStats = async () => {
  if (!process.client) return;
  statsLoading.value = true;
  try {
    stats.value = await $fetch(`/api/projects/${projectId}/analytics/stats`, {
      params: { estimate_id: estimateId },
    });
  } catch (e) {
    console.error('Failed to load stats', e);
    stats.value = null;
  } finally {
    statsLoading.value = false;
  }
};

const baselineTotal = computed(() => stats.value?.project_total || 0);
const perCompanyRound = computed(() => stats.value?.offers?.per_company_round || []);
const latestRoundNumber = computed(() => stats.value?.offers?.latest_round ?? null);

const bestLatestOffer = computed(() => {
  const latest = latestRoundNumber.value ?? perCompanyRound.value.reduce((max: number, o: any) => Math.max(max, o.round_number || 0), 0);
  const latestOffers = perCompanyRound.value.filter((o: any) => (o.round_number || 0) === latest);
  if (!latestOffers.length) return null;
  const best = latestOffers.reduce((acc: any, cur: any) => {
    if (cur.total_amount === undefined || cur.total_amount === null) return acc;
    if (!acc || cur.total_amount < acc.total_amount) return cur;
    return acc;
  }, latestOffers[0]);
  const deltaAbs = best?.total_amount !== undefined && best?.total_amount !== null ? best.total_amount - baselineTotal.value : null;
  const deltaPerc = deltaAbs !== null && baselineTotal.value ? (deltaAbs / baselineTotal.value) * 100 : null;
  return {
    ...best,
    deltaAbs,
    deltaPerc,
    round_number: latest || best?.round_number || null,
  };
});

const summaryRows = computed(() => {
  const rows: Array<any> = [
    {
      id: 'project',
      label: 'Progetto',
      round: null,
      company: '-',
      amount: baselineTotal.value,
      deltaPerc: 0,
    },
  ];

  const roundNumbers = Array.from(new Set(perCompanyRound.value.map((o: any) => o.round_number || 0))).sort((a, b) => a - b);

  roundNumbers.forEach((roundNum) => {
    const offers = perCompanyRound.value.filter((o: any) => (o.round_number || 0) === roundNum);
    if (!offers.length) return;
    const best = offers.reduce((acc: any, cur: any) => {
      if (cur.total_amount === undefined || cur.total_amount === null) return acc;
      if (!acc || cur.total_amount < acc.total_amount) return cur;
      return acc;
    }, offers[0]);
    const deltaAbs = best?.total_amount !== undefined && best?.total_amount !== null ? best.total_amount - baselineTotal.value : null;
    const deltaPerc = deltaAbs !== null && baselineTotal.value ? (deltaAbs / baselineTotal.value) * 100 : null;

    rows.push({
      id: `round-${roundNum}`,
      label: `Round ${roundNum}`,
      round: roundNum,
      company: best?.company || '-',
      amount: best?.total_amount ?? null,
      deltaPerc,
    });
  });

  return rows;
});

const gridConfig: DataGridConfig = {
  columns: [
    {
      field: 'label',
      headerName: 'Voce',
      flex: 2,
      minWidth: 200,
    },
    {
      field: 'company',
      headerName: 'Miglior impresa',
      flex: 1,
      minWidth: 140,
      cellClass: 'font-medium',
    },
    {
      field: 'amount',
      headerName: 'Importo migliore',
      width: 150,
      cellClass: 'ag-right-aligned-cell font-medium',
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
  enableQuickFilter: false, 
  enableExport: false,
  headerHeight: 48,
  rowHeight: 44,
};

const navigateToRoundComparison = (row: any) => {
  if (!row?.round) return;
  navigateTo(`/projects/${projectId}/estimate/${estimateId}/comparison?round=${row.round}`);
};

</script>

<template>
  <div class="h-full flex flex-col overflow-hidden space-y-4">
    <UCard class="flex-1 min-h-0 flex flex-col border-[hsl(var(--border))] bg-[hsl(var(--card))]" :ui="{ body: { base: 'flex-1 min-h-0 flex flex-col' } }">
      <template #header>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
          <div>
            <p class="text-xs uppercase tracking-wide font-medium text-[hsl(var(--muted-foreground))]">
              Dashboard Ritorni di Gara
            </p>
            <h1 class="text-lg font-semibold text-[hsl(var(--foreground))]">
              {{ currentEstimate?.name || 'Dettaglio Gare' }}
            </h1>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UBadge v-if="(summaryRows || []).length > 1" color="neutral" variant="soft">
              <Icon name="heroicons:arrows-up-down" class="w-3.5 h-3.5 mr-1" />
              {{ (summaryRows || []).length - 1 }} round
            </UBadge>
            <div class="flex items-center gap-2 text-sm">
              <span class="stat-pill">
                Progetto: {{ formatCurrency(baselineTotal) }}
              </span>
              <span v-if="bestLatestOffer" class="stat-pill stat-pill--success">
                Migliore: {{ formatCurrency(bestLatestOffer?.total_amount) }} (Round {{ bestLatestOffer?.round_number || '-' }})
              </span>
              <span v-if="bestLatestOffer?.deltaPerc !== null && bestLatestOffer?.deltaPerc !== undefined" :class="['stat-pill', (bestLatestOffer?.deltaPerc || 0) <= 0 ? 'stat-pill--success' : 'stat-pill--warning']">
                Delta: {{ formatDeltaPerc(bestLatestOffer?.deltaPerc) }}
              </span>
            </div>
          </div>
        </div>
      </template>


      <DataGrid
        class="h-full"
        :config="gridConfig"
        :row-data="summaryRows || []"
        :loading="loading || statsLoading"
        export-filename="confronto-round"
        empty-state-title="Nessun Round"
        empty-state-message="Non sono stati ancora gestiti round di gara per questo preventivo."
        @row-dblclick="(params) => navigateToRoundComparison(params.data)"
      />
    </UCard>
  </div>
</template>
