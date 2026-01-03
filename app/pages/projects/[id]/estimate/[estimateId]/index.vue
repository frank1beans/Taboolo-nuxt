<script setup lang="ts">
import { useRoute } from 'vue-router';
import type { GridApi, GridReadyEvent } from 'ag-grid-community';
import { computed, onMounted, onBeforeUnmount, reactive, ref, defineAsyncComponent } from 'vue';
import type { DataGridConfig } from '~/types/data-grid';
import type { ApiEstimate, ApiOfferSummary } from '~/types/api';
import { queryApi } from '~/utils/queries';
import { QueryKeys } from '~/types/queries';
import { useCurrentContext } from '~/composables/useCurrentContext';
import DataGridActions from '~/components/data-grid/DataGridActions.vue';
import { getStatusConfig } from '~/utils/status-config';
import DataGridPage from '~/components/layout/DataGridPage.vue';
import PageToolbar from '~/components/layout/PageToolbar.vue';
import { formatCurrency as formatCurrencyLib, formatDelta } from '~/lib/formatters';
import { getDeltaCellClass } from '~/utils/delta-styling';
import { useActionsStore } from '~/stores/actions';
import type { Action } from '~/types/actions';

// Lazy load heavy ImportWizard component (31KB)
const ImportWizard = defineAsyncComponent(() => import('~/components/projects/ImportWizard.vue'));

const route = useRoute();

const projectId = route.params.id as string;
const estimateId = route.params.estimateId as string;

// 1. Fetch Estimate Details (Baseline Context)
const { data: currentEstimate, status: estimateStatus, refresh: refreshEstimate } = await useAsyncData<ApiEstimate>(
    `estimate-details-${estimateId}`,
    () => queryApi.fetch(QueryKeys.ESTIMATE_DETAILS, { id: estimateId })
);

// 2. Fetch Offers linked to this Estimate
const { data: offersData, status: offersStatus, refresh: refreshOffers } = await useAsyncData(
    `estimate-offers-${estimateId}`,
    () => queryApi.fetch(QueryKeys.PROJECT_OFFERS, { project_id: projectId, estimate_id: estimateId })
);

// 3. Keep Alert Summary legacy for now (Plan to refactor)
const { data: alertSummary, status: alertStatus, refresh: refreshAlertSummary } = await useFetch(
  `/api/projects/${projectId}/offers/alerts/summary`,
  {
    key: `project-${projectId}-estimate-${estimateId}-alert-summary`,
    query: { group_by: 'offer', estimate_id: estimateId, status: 'open' },
  }
);

const { setCurrentEstimate } = useCurrentContext();
const actionsStore = useActionsStore();
const actionOwner = 'page:estimate-detail';

// Ensure context matches URL
onMounted(() => {
  console.log('Mounting Estimate Dashboard', estimateId);
  setCurrentEstimate(estimateId);
});

onBeforeUnmount(() => {
  actionsStore.unregisterOwner(actionOwner);
});

const loading = computed(() => estimateStatus.value === 'pending');
const offersLoading = computed(() => offersStatus.value === 'pending');
const alertsLoading = computed(() => alertStatus.value === 'pending');

const offerRows = computed<ApiOfferSummary[]>(() => offersData.value?.items || []);
const offersCount = computed(() => offerRows.value.length);

// Baseline Total comes from the Estimate itself
const baselineTotal = computed(() => currentEstimate.value?.total_amount || 0);

const formatCurrency = (value?: number | string | null) => {
  const numeric = typeof value === 'string' ? Number(value) : value;
  const safe = typeof numeric === 'number' && !Number.isNaN(numeric) ? numeric : 0;
  return formatCurrencyLib(safe);
};

const formatDeltaPerc = (value?: number | null) => (value === null || value === undefined ? '-' : formatDelta(value));

const alertSummaryItems = computed(() => alertSummary.value?.items || []);
const alertSummaryTotal = computed(() => alertSummary.value?.total ?? 0);
const alertSummaryMap = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {};
  alertSummaryItems.value.forEach((item: { offer_id?: string; total?: number }) => {
    if (item.offer_id) {
      map[item.offer_id] = Number(item.total || 0);
    }
  });
  return map;
});

// Find the best offer across all rounds (lowest total_amount)
const bestOfferId = computed(() => {
  const offers = offerRows.value.filter(o => o.total_amount !== null && o.total_amount !== undefined);
  if (!offers.length) return null;
  const best = offers.reduce<ApiOfferSummary | null>((acc, cur) => {
    if (!acc || (cur.total_amount ?? Infinity) < (acc.total_amount ?? Infinity)) return cur;
    return acc;
  }, offers[0] ?? null);
  return best?.id || null;
});

// Unified rows: Project baseline + all offers
const unifiedRows = computed(() => {
  const rows: Array<Record<string, unknown>> = [];

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
    alertCount: 0,
    isBest: false,
    isBaseline: true,
  });

  // Add all offers with computed deltas
  offerRows.value.forEach((offer) => {
    const amount = offer.total_amount ?? null;
    const deltaAmount = amount !== null ? amount - baselineTotal.value : null;
    const deltaPerc = deltaAmount !== null && baselineTotal.value ? (deltaAmount / baselineTotal.value) * 100 : null;

    rows.push({
      ...offer,
      rowType: 'offer',
      company_name: offer.company_name ?? '-',
      deltaAmount,
      deltaPerc,
      alertCount: alertSummaryMap.value[offer.id] || 0,
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
      cellRenderer: (params: { value?: string }): string => {
        return `<span class="font-medium">${params.value || ''}</span>`;
      },
    },
    {
      field: 'round_number',
      headerName: 'Round',
      width: 100,
      cellClass: 'ag-right-aligned-cell',
      valueFormatter: (params: { value: number | null }) => params.value !== null ? `R${params.value}` : '-',
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
      cellRenderer: (params: { value?: string }): string => {
        const rawStatus = params.value;
        if (!rawStatus) return '';
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
      valueFormatter: (params: { value: number | string }): string => formatCurrency(params.value as number),
    },
    {
      field: 'deltaAmount',
      headerName: 'Δ Importo',
      width: 140,
      cellClass: 'ag-right-aligned-cell',
      cellRenderer: (params: { value: number | null; data?: { isBaseline?: boolean } }): string => {
        const value = params.value;
        if (value === null || value === undefined || params.data?.isBaseline) return '-';
        const formatted = formatCurrency(value);
        const colorClass = getDeltaCellClass(value);
        return `<span class="${colorClass}">${formatted}</span>`;
      },
    },
    {
      field: 'deltaPerc',
      headerName: 'Δ %',
      width: 100,
      cellClass: 'ag-right-aligned-cell',
      cellRenderer: (params: { value: number | null; data?: { isBaseline?: boolean } }): string => {
        const value = params.value;
        if (value === null || value === undefined || params.data?.isBaseline) return '-';
        const formatted = formatDeltaPerc(value);
        const colorClass = getDeltaCellClass(value, { addFontWeight: value < 0 });
        return `<span class="${colorClass}">${formatted}</span>`;
      },
    },
    {
      field: 'alertCount',
      headerName: 'Alert',
      width: 110,
      cellClass: 'ag-right-aligned-cell',
      cellRenderer: (params: { value?: number; data?: { isBaseline?: boolean } }): string => {
        if (params.data?.isBaseline) return '-';
        const count = Number(params.value || 0);
        if (!count) return '-';
        return `<span class="stat-pill stat-pill--warning">${count}</span>`;
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
  getRowClass: (params: { data?: { isBaseline?: boolean; isBest?: boolean } }) => {
    if (params.data?.isBaseline) return 'bg-[hsl(var(--info-light))]';
    if (params.data?.isBest) return 'bg-[hsl(var(--success-light))]';
    return '';
  },
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

type OfferRow = {
  id: string;
  name?: string | null;
  company_name?: string | null;
  round_number?: number | null;
  status?: string;
  mode?: string | null;
  total_amount?: number | null;
  estimate_id?: string | null;
  rowType?: 'project' | 'offer';
  alertCount?: number;
  deltaAmount?: number | null;
  deltaPerc?: number | null;
  isBest?: boolean;
  isBaseline?: boolean;
};

const navigateToPricelist = (row: OfferRow | null | undefined) => {
  if (!row) return;
  const params = new URLSearchParams();
  // Using query 'estimateId' equal to the current estimate, but maybe pricelist needs specific offer context?
  // Actually, 'Listino' usually implies seeing the items.
  // The pricelist page uses `estimateId` query param to load items.
  // If we want to see a specific offer's items, we should pass that context.
  // The pricelist logic (checked before) uses `estimateId` query param. 
  // Wait, `selectedEstimateId` in pricelist page defaults to query param.
  // But here we are listing OFFERS (which are technically estimates/returns?)
  // If `row.isBaseline`, it is the project baseline.
  // If `row.rowType === 'offer'`, it is a return.
  
  // Assuming pricelist page can filter by round/company or just show the estimate content.
  // If I want to see the items of THIS offer:
  // Navigate to /projects/.../pricelist?estimateId=[estimateId]&round=[row.round]&company=[row.company]
  
  params.set('estimateId', estimateId);
  if (row.round_number !== undefined && row.round_number !== null) params.set('round', String(row.round_number));
  if (row.company_name) params.set('company', row.company_name);
  
  navigateTo(`/projects/${projectId}/pricelist?${params.toString()}`);
};

const openOfferDetail = (row: OfferRow | null | undefined) => {
   if (!row || row.isBaseline) return;
   const params = new URLSearchParams();
   if (row.round_number !== undefined) params.set('round', String(row.round_number));
   if (row.company_name) params.set('company', row.company_name);
   navigateTo(`/projects/${projectId}/estimate/${estimateId}/offer?${params.toString()}`);
};

const openEditOffer = (row: OfferRow | null | undefined) => {
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
    const payload: Record<string, unknown> = {
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
    await refreshAlertSummary();
    await refreshEstimate();
  } catch (error) {
    console.error("Errore durante il salvataggio dell'offerta", error);
    window.alert("Errore durante il salvataggio dell'offerta.");
  }
};

// ---------------------------------------------------------------------------
// Delete Confirmation Modal
// ---------------------------------------------------------------------------
const isDeleteModalOpen = ref(false);
const offerToDelete = ref<OfferRow | null>(null);

const openDeleteModal = (row: any | null | undefined) => {
  console.log('openDeleteModal called', { row, id: row?.id, isBaseline: row?.isBaseline });
  if (!row?.id || row.isBaseline) {
    console.log('openDeleteModal early return - no id or isBaseline');
    return;
  }
  offerToDelete.value = row;
  isDeleteModalOpen.value = true;
};

const closeDeleteModal = () => {
  isDeleteModalOpen.value = false;
  offerToDelete.value = null;
};

const confirmDeleteOffer = async () => {
  const row = offerToDelete.value;
  if (!row?.id) {
    closeDeleteModal();
    return;
  }
  
  try {
    await $fetch(`/api/projects/${projectId}/offers/${row.id}`, { method: 'DELETE' });
    closeDeleteModal();
    await refreshOffers();
    await refreshAlertSummary();
    await refreshEstimate();
  } catch (error) {
    console.error("Errore durante l'eliminazione dell'offerta", error);
    window.alert("Errore durante l'eliminazione dell'offerta.");
    closeDeleteModal();
  }
};

const deleteEstimate = async () => {
  const confirmed = window.confirm(
    `Sei sicuro di voler eliminare questo preventivo ("${currentEstimate.value?.name}")? L'operazione non è reversibile.`
  );
  if (!confirmed) return;

  try {
    await $fetch(`/api/projects/${projectId}/estimates/${estimateId}`, {
      method: "DELETE",
    });
    // Redirect to project dashboard after deletion
    navigateTo(`/projects/${projectId}`);
  } catch (error) {
    console.error("Errore durante l'eliminazione del preventivo", error);
    window.alert("Si è verificato un errore durante l'eliminazione del preventivo.");
  }
};

const gridContext = computed(() => ({
  rowActions: {
    viewPricelist: (row: OfferRow) => navigateToPricelist(row),
    viewOffer: (row: OfferRow) => openOfferDetail(row),
    resolve: () => navigateTo(`/projects/${projectId}/conflicts?estimateId=${estimateId}`), // Should filter by offer?
    edit: (row: OfferRow) => row?.isBaseline ? null : openEditOffer(row),
    remove: (row: OfferRow) => row?.isBaseline ? deleteEstimate() : openDeleteModal(row),
  },
  // Helper to determine if resolution is needed
  hasAlerts: (row: OfferRow) => (alertSummaryMap.value[row.id] || 0) > 0
}));

// Toolbar State
const searchText = ref('')
const gridApi = ref<GridApi | null>(null)
const { exportToXlsx } = useDataGridExport(gridApi)
const onGridReady = (params: GridReadyEvent<Record<string, unknown>>) => {
  gridApi.value = params.api
}

const handleReset = () => {
  searchText.value = ''
  gridApi.value?.setFilterModel(null)
}


const registerAction = (action: Action) => {
  actionsStore.registerAction(action, { owner: actionOwner, overwrite: true });
};

onMounted(() => {
  registerAction({
    id: 'grid.exportExcel',
    label: 'Esporta in Excel',
    description: 'Esporta dati in Excel',
    category: 'Tabelle',
    scope: 'selection',
    icon: 'i-heroicons-arrow-down-tray',
    keywords: ['export', 'excel', 'tabella'],
    handler: () => exportToXlsx('ritorni-gara'),
  });

  registerAction({
    id: 'estimate.compareOffers',
    label: 'Confronta offerte',
    description: 'Confronta offerte del preventivo corrente',
    category: 'Preventivi',
    scope: 'estimate',
    icon: 'i-heroicons-arrows-right-left',
    keywords: ['confronto', 'offerte'],
    handler: () => navigateTo(`/projects/${projectId}/estimate/${estimateId}/comparison`),
  });

  registerAction({
    id: 'estimate.importOffers',
    label: 'Importa offerte',
    description: 'Apri la procedura di import offerte',
    category: 'Preventivi',
    scope: 'estimate',
    icon: 'i-heroicons-arrow-up-tray',
    keywords: ['import', 'offerte'],
    handler: () => {
      isImportModalOpen.value = true
    },
  })

  registerAction({
    id: 'grid.resetFilters',
    label: 'Reset filtri tabella',
    description: 'Cancella filtri e ricerca della tabella',
    category: 'Tabelle',
    scope: 'selection',
    icon: 'i-heroicons-arrow-path',
    keywords: ['reset', 'filtri', 'search'],
    handler: () => handleReset(),
  })

  registerAction({
    id: 'estimate.openConflicts',
    label: 'Apri conflitti preventivo',
    description: 'Vai ai conflitti del preventivo corrente',
    category: 'Preventivi',
    scope: 'estimate',
    icon: 'i-heroicons-exclamation-triangle',
    keywords: ['conflitti', 'alert'],
    handler: () => navigateTo(`/projects/${projectId}/conflicts?estimateId=${estimateId}`),
  })
});

// ---------------------------------------------------------------------------
// Import Modal
// ---------------------------------------------------------------------------
const isImportModalOpen = ref(false);

const handleImportSuccess = async () => {
  isImportModalOpen.value = false;
  await refreshOffers();
  await refreshAlertSummary();
};
</script>

<template>
  <div class="h-full flex flex-col">
    <DataGridPage
      title="Ritorni di Gara"
      :grid-config="unifiedGridConfig"
      :row-data="unifiedRows"
      :loading="loading || offersLoading || alertsLoading"
      empty-state-title="Nessun dato"
      empty-state-message="Non ci sono ancora offerte o dati di progetto."
      :custom-components="{ actionsRenderer: DataGridActions }"
      :context-extras="gridContext"
      
      :show-toolbar="false"
      :filter-text="searchText"
      @row-dblclick="navigateToPricelist"
      @grid-ready="onGridReady"
    >
      <!-- Meta: Estimate Name + Count -->
      <template #header-meta>
         <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                {{ currentEstimate?.name || 'Dettaglio Gare' }}
            </span>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                <Icon name="heroicons:document-text" class="w-3.5 h-3.5" />
                {{ offersCount }} offerte
            </span>
         </div>
      </template>

      <!-- Actions removed (moved to Topbar) -->
      <template #actions/>

      <!-- Toolbar -->
      <template #pre-grid>
        <!-- Alerts moved to bottom bar -->
        <ClientOnly>
          <Teleport to="#app-bottombar-right">
            <div v-if="alertSummaryTotal > 0" class="flex items-center gap-4 text-xs">
              <div class="flex items-center gap-2 text-[hsl(var(--warning))] font-medium animate-pulse">
                <Icon name="heroicons:exclamation-triangle" class="w-4 h-4" />
                <span>{{ alertSummaryTotal }} Alert da risolvere</span>
              </div>
              <div class="h-4 w-px bg-[hsl(var(--border))]" />
              <UButton
                size="2xs"
                color="warning"
                variant="solid"
                label="Risoluzione Alert"
                icon="i-heroicons-wrench-screwdriver"
                :to="`/projects/${projectId}/conflicts?estimateId=${estimateId}`"
              />
            </div>
          </Teleport>
        </ClientOnly>

        <ClientOnly>
          <Teleport to="#topbar-actions-portal">
            <PageToolbar
              v-model="searchText"
              search-placeholder="Filtra per preventivo, impresa o round..."
              class="!py-0"
            >
              <template #right>
                <ActionList
                  layout="toolbar"
                  :action-ids="[
                    'grid.resetFilters',
                    'grid.exportExcel',
                    'estimate.importOffers',
                    'estimate.compareOffers',
                  ]"
                  :primary-action-ids="['estimate.compareOffers']"
                />
              </template>
            </PageToolbar>
          </Teleport>
        </ClientOnly>
      </template>
    </DataGridPage>

    <!-- Modal Teleport -->
    <Teleport to="body">
      <!-- Edit Offer Modal -->
      <div v-if="isEditModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6">
        <!-- Backdrop -->
        <div 
          class="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm transition-opacity"
          @click="closeEditModal"
        />

        <!-- Modal Card -->
        <div class="relative z-[105] w-full max-w-lg rounded-[var(--card-radius)] shadow-2xl overflow-hidden bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex flex-col max-h-[90vh]">
          
          <!-- Header -->
          <div class="px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)] flex items-center justify-between shrink-0">
            <div>
              <p class="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Modifica Offerta</p>
              <h3 class="text-lg font-semibold text-[hsl(var(--foreground))]">
                {{ editForm.name || editForm.company_name || 'Offerta' }}
              </h3>
            </div>
            <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" class="-mr-2" @click="closeEditModal" />
          </div>

          <!-- Scrollable Body -->
          <div class="p-6 space-y-6 overflow-y-auto">
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
          <div class="px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)] flex items-center justify-end gap-3 shrink-0">
            <UButton color="neutral" variant="ghost" @click="closeEditModal">
              Annulla
            </UButton>
            <UButton color="primary" icon="i-heroicons-check" @click="saveOffer">
              Salva Modifiche
            </UButton>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <ConfirmModal
        :open="isDeleteModalOpen"
        title="Conferma Eliminazione"
        confirm-label="Elimina"
        variant="danger"
        @confirm="confirmDeleteOffer"
        @cancel="closeDeleteModal"
      >
        <p class="text-[hsl(var(--foreground))]">
          Eliminare l'offerta <strong>{{ offerToDelete?.name || offerToDelete?.company_name }}</strong>?
        </p>
        <p class="text-sm text-[hsl(var(--muted-foreground))] mt-2">
          Verranno rimossi anche tutti i relativi items.
        </p>
      </ConfirmModal>

      <!-- Import Wizard Modal -->
      <div v-if="isImportModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6">
        <div 
          class="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm transition-opacity"
          @click="isImportModalOpen = false"
        />
        <div class="relative z-[105] w-full max-w-5xl h-[85vh] rounded-[var(--card-radius)] shadow-2xl overflow-hidden bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex flex-col">
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
