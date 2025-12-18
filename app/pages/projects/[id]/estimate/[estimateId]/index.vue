<script setup lang="ts">
import { useRoute } from 'vue-router';
import { computed, onMounted, reactive, ref } from 'vue';
import type { DataGridConfig } from '~/types/data-grid';
import { useCurrentContext } from '~/composables/useCurrentContext';
import DataGridActions from '~/components/data-grid/DataGridActions.vue';
import { getStatusConfig } from '~/utils/status-mappings';
import DataGridPage from '~/components/layout/DataGridPage.vue';

const route = useRoute();
const projectId = route.params.id as string;
const estimateId = route.params.estimateId as string;

// Use explicit key in useFetch to avoid conflicts
const { data: context, status, refresh } = await useFetch(`/api/projects/${projectId}/context`, {
  key: `project-context-${projectId}`,
});

const { data: offersResponse, status: offersStatus, refresh: refreshOffers } = await useFetch(
  `/api/projects/${projectId}/offers`,
  {
    key: `project-${projectId}-offers-${estimateId}`,
    query: { estimate_id: estimateId },
  },
);

const { setCurrentEstimate } = useCurrentContext();

// Ensure context matches URL
onMounted(() => {
  console.log('Mounting Estimate Dashboard', estimateId);
  setCurrentEstimate(estimateId);
  loadStats();
});

const loading = computed(() => status.value === 'pending');
const estimates = computed(() => context.value?.estimates || []);
const currentEstimate = computed(() => estimates.value.find((e: any) => e.id === estimateId));

const stats = ref<any | null>(null);
const statsLoading = ref(false);

const formatCurrency = (value?: number | string | null) => {
  const numeric = typeof value === 'string' ? Number(value) : value;
  const safe = typeof numeric === 'number' && !Number.isNaN(numeric) ? numeric : 0;
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
const offerRows = computed(() => offersResponse.value?.offers || []);
const offersLoading = computed(() => offersStatus.value === 'pending');
const offersCount = computed(() => offerRows.value.length);

// Find the best offer across all rounds (lowest total_amount)
const bestOfferId = computed(() => {
  const offers = offerRows.value.filter((o: any) => o.total_amount !== null && o.total_amount !== undefined);
  if (!offers.length) return null;
  const best = offers.reduce((acc: any, cur: any) => {
    if (!acc || cur.total_amount < acc.total_amount) return cur;
    return acc;
  }, offers[0]);
  return best?.id || null;
});

// Unified rows: Project baseline + all offers
const unifiedRows = computed(() => {
  const rows: Array<any> = [];

  // Add project baseline row
  rows.push({
    id: 'project-baseline',
    rowType: 'project',
    round_number: null,
    company_name: '-',
    name: 'Preventivo di Progetto',
    status: 'baseline',
    total_amount: baselineTotal.value,
    deltaAmount: 0,
    deltaPerc: 0,
    isBest: false,
    isBaseline: true,
  });

  // Add all offers with computed deltas
  offerRows.value.forEach((offer: any) => {
    const amount = offer.total_amount ?? null;
    const deltaAmount = amount !== null ? amount - baselineTotal.value : null;
    const deltaPerc = deltaAmount !== null && baselineTotal.value ? (deltaAmount / baselineTotal.value) * 100 : null;

    rows.push({
      ...offer,
      rowType: 'offer',
      deltaAmount,
      deltaPerc,
      isBest: offer.id === bestOfferId.value,
      isBaseline: false,
    });
  });

  return rows;
});

// Grid configuration for unified table
const unifiedGridConfig: DataGridConfig = {
  columns: [
    {
      field: 'name',
      headerName: 'Preventivo',
      flex: 2,
      minWidth: 220,
      cellRenderer: (params: any) => {
        return `<span class="font-medium">${params.value || ''}</span>`;
      },
    },
    {
      field: 'round_number',
      headerName: 'Round',
      width: 100,
      cellClass: 'ag-right-aligned-cell',
      valueFormatter: (params: any) => params.value !== null ? `R${params.value}` : '-',
    },
    {
      field: 'company_name',
      headerName: 'Impresa',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'status',
      headerName: 'Stato',
      width: 140,
      cellRenderer: (params: any) => {
        const rawStatus = params.value;
        const config = getStatusConfig(rawStatus);
        return `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.color}">
          <i class="${config.icon} w-3 h-3 mr-1"></i>
          ${config.label}
        </span>`;
      },
    },
    {
      field: 'total_amount',
      headerName: 'Importo',
      width: 150,
      cellClass: 'ag-right-aligned-cell font-semibold',
      valueFormatter: (params: any) => formatCurrency(params.value),
    },
    {
      field: 'deltaAmount',
      headerName: 'Δ Importo',
      width: 140,
      cellClass: 'ag-right-aligned-cell',
      cellRenderer: (params: any) => {
        const value = params.value;
        if (value === null || value === undefined || params.data?.isBaseline) return '-';
        const formatted = formatCurrency(value);
        const colorClass = value < 0 ? 'text-green-600 dark:text-green-400' : value > 0 ? 'text-red-600 dark:text-red-400' : '';
        return `<span class="${colorClass}">${formatted}</span>`;
      },
    },
    {
      field: 'deltaPerc',
      headerName: 'Δ %',
      width: 100,
      cellClass: 'ag-right-aligned-cell',
      cellRenderer: (params: any) => {
        const value = params.value;
        if (value === null || value === undefined || params.data?.isBaseline) return '-';
        const formatted = formatDeltaPerc(value);
        const colorClass = value < 0 ? 'text-green-600 dark:text-green-400 font-semibold' : value > 0 ? 'text-red-600 dark:text-red-400' : '';
        return `<span class="${colorClass}">${formatted}</span>`;
      },
    },
    {
      field: 'actions',
      headerName: 'Azioni',
      width: 140,
      cellRenderer: 'actionsRenderer',
      pinned: 'right',
      sortable: false,
      filter: false,
      suppressMenu: true,
    },
  ],
  defaultColDef: {
    sortable: true,
    resizable: true,
    filter: true,
    suppressHeaderMenuButton: true,
  },
  headerHeight: 48,
  rowHeight: 48,
  enableQuickFilter: true,
  enableExport: true,
  getRowClass: (params: any) => {
    if (params.data?.isBaseline) return 'bg-blue-50/50 dark:bg-blue-950/20';
    if (params.data?.isBest) return 'bg-green-50/50 dark:bg-green-950/20';
    return '';
  },
};

const navigateToComparison = (row: any) => {
  if (row?.isBaseline) return;
  const params = new URLSearchParams();
  if (row?.round_number !== undefined && row?.round_number !== null) {
    params.set('round', String(row.round_number));
  }
  if (row?.company_name && row.company_name !== '-') {
    params.set('company', row.company_name);
  }
  navigateTo(`/projects/${projectId}/estimate/${estimateId}/comparison?${params.toString()}`);
};

// ---------------------------------------------------------------------------
// Edit Modal
// ---------------------------------------------------------------------------
const isEditModalOpen = ref(false);
const editForm = reactive({
  id: '',
  name: '',
  company_name: '',
  round_number: 1 as number | string,
  status: 'draft',
  mode: 'detailed',
  total_amount: null as number | string | null,
});

const statusOptions = [
  { label: 'Bozza', value: 'draft' },
  { label: 'Inviata', value: 'submitted' },
  { label: 'Accettata', value: 'accepted' },
  { label: 'Rifiutata', value: 'rejected' },
];

const modeOptions = [
  { label: 'Computo (dettagliato)', value: 'detailed' },
  { label: 'Lista (aggregato)', value: 'aggregated' },
];

const resetEditForm = () => {
  editForm.id = '';
  editForm.name = '';
  editForm.company_name = '';
  editForm.round_number = 1;
  editForm.status = 'draft';
  editForm.mode = 'detailed';
  editForm.total_amount = null;
};

const closeEditModal = () => {
  isEditModalOpen.value = false;
  resetEditForm();
};

const openOfferDetail = (row: any) => {
  if (!row || row.isBaseline) return;
  const params = new URLSearchParams();
  if (row.round_number !== undefined) params.set('round', String(row.round_number));
  if (row.company_name) params.set('company', row.company_name);
  navigateTo(`/projects/${projectId}/estimate/${estimateId}/offer?${params.toString()}`);
};

const openEditOffer = (row: any) => {
  if (!row || row.isBaseline) return;
  editForm.id = row.id;
  editForm.name = row.name || '';
  editForm.company_name = row.company_name || '';
  editForm.round_number = row.round_number ?? 1;
  editForm.status = row.status || 'draft';
  editForm.mode = row.mode || 'detailed';
  editForm.total_amount = row.total_amount ?? null;
  isEditModalOpen.value = true;
};

const saveOffer = async () => {
  if (!editForm.id) return;
  try {
    const payload: Record<string, any> = {
      name: editForm.name,
      company_name: editForm.company_name,
      round_number: Number(editForm.round_number) || 0,
      status: editForm.status,
      mode: editForm.mode,
    };

    if (editForm.total_amount === null || editForm.total_amount === undefined || editForm.total_amount === '') {
      payload.total_amount = null;
    } else {
      payload.total_amount = Number(editForm.total_amount);
    }

    await $fetch(`/api/projects/${projectId}/offers/${editForm.id}`, {
      method: 'PATCH',
      body: payload,
    });

    closeEditModal();
    await refreshOffers();
    await loadStats();
    await refresh();
  } catch (error) {
    console.error("Errore durante il salvataggio dell'offerta", error);
    window.alert("Errore durante il salvataggio dell'offerta.");
  }
};

const deleteOffer = async (row: any) => {
  if (!row?.id || row.isBaseline) return;
  const ok = window.confirm(`Eliminare l'offerta ${row.name || row.company_name || row.id}? Verranno rimossi anche i relativi items.`);
  if (!ok) return;
  try {
    await $fetch(`/api/projects/${projectId}/offers/${row.id}`, { method: 'DELETE' });
    await refreshOffers();
    await loadStats();
    await refresh();
  } catch (error) {
    console.error("Errore durante l'eliminazione dell'offerta", error);
    window.alert("Errore durante l'eliminazione dell'offerta.");
  }
};

const gridContext = computed(() => ({
  rowActions: {
    open: (row: any) => row?.isBaseline ? null : openOfferDetail(row),
    edit: (row: any) => row?.isBaseline ? null : openEditOffer(row),
    remove: (row: any) => row?.isBaseline ? null : deleteOffer(row),
  },
  // Hide actions for baseline row
  hideActionsFor: (row: any) => row?.isBaseline === true,
}));
</script>

<template>
  <div class="h-full flex flex-col">
    <DataGridPage
      title="Dashboard Ritorni di Gara"
      :subtitle="currentEstimate?.name || 'Dettaglio Gare'"
      :grid-config="unifiedGridConfig"
      :row-data="unifiedRows"
      :loading="loading || statsLoading || offersLoading"
      toolbar-placeholder="Filtra per preventivo, impresa o round..."
      export-filename="ritorni-gara"
      empty-state-title="Nessun dato"
      empty-state-message="Non ci sono ancora offerte o dati di progetto."
      :custom-components="{ actionsRenderer: DataGridActions }"
      :context-extras="gridContext"
      @row-dblclick="openOfferDetail"
    >
      <template #actions>
        <UBadge v-if="offersCount > 0" color="neutral" variant="soft">
            <Icon name="heroicons:document-text" class="w-3.5 h-3.5 mr-1" />
            {{ offersCount }} offerte
        </UBadge>
        
        <div class="flex items-center gap-2 ml-2">
            <UButton
            color="primary"
            variant="solid"
            icon="i-heroicons-plus"
            size="sm"
            @click="navigateTo(`/projects/${projectId}/estimate/${estimateId}/comparison`)"
            >
            Confronto Dettagliato
            </UButton>
        </div>
      </template>
    </DataGridPage>

    <Teleport to="body">
      <div v-if="isEditModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6">
        <!-- Backdrop -->
        <div 
          class="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm transition-opacity"
          @click="closeEditModal"
        />

        <!-- Modal Card -->
        <div class="relative z-[105] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
          
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between shrink-0">
            <div>
              <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Modifica Offerta</p>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ editForm.name || editForm.company_name || 'Offerta' }}
              </h3>
            </div>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" class="-mr-2" @click="closeEditModal" />
          </div>

          <!-- Scrollable Body -->
          <div class="p-6 space-y-5 overflow-y-auto">
             <div class="grid grid-cols-1 gap-4">
                <UFormField label="Impresa" name="company">
                  <UInput v-model="editForm.company_name" placeholder="Impresa" />
                </UFormField>

                <div class="grid grid-cols-2 gap-4">
                  <UFormField label="Round" name="round">
                    <UInput v-model="editForm.round_number" type="number" min="1" step="1" />
                  </UFormField>

                  <UFormField label="Stato" name="status">
                    <USelect v-model="editForm.status" :options="statusOptions" option-attribute="label" value-attribute="value" />
                  </UFormField>
                </div>
              </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-end gap-3 shrink-0">
            <UButton color="gray" variant="ghost" @click="closeEditModal">
              Annulla
            </UButton>
            <UButton color="primary" icon="i-heroicons-check" @click="saveOffer">
              Salva Modifiche
            </UButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
