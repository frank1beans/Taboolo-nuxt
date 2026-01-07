<script setup lang="ts">
import { useRoute } from 'vue-router';
import type { GridApi, GridReadyEvent } from 'ag-grid-community';
import { computed, onMounted, onBeforeUnmount, reactive, ref, defineAsyncComponent, toValue, watch } from 'vue';
import type { DataGridConfig } from '~/types/data-grid';
import type { ApiEstimate, ApiOfferSummary } from '~/types/api';
import { useCurrentContext } from '~/composables/useCurrentContext';
import DataGridActions from '~/components/data-grid/DataGridActions.vue';
import { getStatusConfig } from '~/utils/status-config';
import DataGridPage from '~/components/layout/DataGridPage.vue';
import PageToolbar from '~/components/layout/PageToolbar.vue';
import { formatCurrency as formatCurrencyLib, formatDelta } from '~/lib/formatters';
import { getDeltaCellClass } from '~/utils/delta-styling';
import { useActionsStore } from '~/stores/actions';
import CountBadge from '~/components/ui/CountBadge.vue';
import { usePageSidebarModule } from '~/composables/useSidebarModules';
import SidebarActionsModule from '~/components/sidebar/modules/SidebarActionsModule.vue';
import type { Action } from '~/types/actions';

// Assets module handled by layout centrally
// Lazy load heavy ImportWizard component (31KB)
const ImportWizard = defineAsyncComponent(() => import('~/components/projects/ImportWizard.vue'));

const route = useRoute();

const projectId = computed(() => route.params.id as string);
const estimateId = computed(() => route.params.estimateId as string);

// 1. Fetch Estimate Details (Baseline Context)
const { data: currentEstimate, status: estimateStatus, refresh: refreshEstimate } = await useAsyncData<ApiEstimate>(
    `estimate-details-${toValue(estimateId)}`,
    () => {
        const pId = projectId.value;
        const eId = estimateId.value;
        if (!pId || !eId || pId === 'undefined' || eId === 'undefined') {
            return Promise.resolve(null as any); // Return null or handle as needed, but don't fetch
        }
        return $fetch<ApiEstimate>(`/api/projects/${pId}/estimate/${eId}`);
    },
    { watch: [estimateId] }
);

// 2. Fetch Offers linked to this Estimate
const { data: offersData, status: offersStatus, refresh: refreshOffers } = await useAsyncData(
    `estimate-offers-${toValue(estimateId)}`,
    () => $fetch<{ offers: ApiOfferSummary[] }>(`/api/projects/${projectId.value}/offers`, { query: { estimate_id: estimateId.value } }),
    { watch: [estimateId] }
);

// 3. Keep Alert Summary legacy for now (Plan to refactor)
const { data: alertSummary, status: alertStatus, refresh: refreshAlertSummary } = await useFetch(
  () => `/api/projects/${projectId.value}/offers/alerts/summary`,
  {
    key: `project-${toValue(projectId)}-estimate-${toValue(estimateId)}-alert-summary`,
    query: { group_by: 'offer', estimate_id: estimateId, status: 'open' },
    watch: [estimateId]
  }
);

const { setCurrentEstimate, currentProject, currentEstimate: contextEstimate } = useCurrentContext();
const actionsStore = useActionsStore();
const actionOwner = 'page:estimate-detail';

usePageSidebarModule({
  id: 'actions',
  label: 'Azioni',
  icon: 'heroicons:command-line',
  order: 2,
  group: 'secondary',
  autoActivate: true,
  component: SidebarActionsModule,
  props: {
    actionIds: [
      'estimate.importOffers',
      'grid.exportExcel',
      'estimate.compareOffers',
      'estimate.openConflicts',
      'grid.resetFilters',
    ],
    primaryActionIds: ['estimate.importOffers'],
  },
});


// Ensure context matches URL
watch(estimateId, (newId) => {
  if (newId) setCurrentEstimate(newId);
}, { immediate: true });

onMounted(() => {
  console.log('Mounting Estimate Dashboard', estimateId.value);
  // setCurrentEstimate calls moved to watcher
});

onBeforeUnmount(() => {
  actionsStore.unregisterOwner(actionOwner);
});

const loading = computed(() => estimateStatus.value === 'pending');
const offersLoading = computed(() => offersStatus.value === 'pending');
const alertsLoading = computed(() => alertStatus.value === 'pending');

const offerRows = computed<ApiOfferSummary[]>(() =>
  (offersData.value?.offers || []).map((offer: any) => ({
    ...offer,
    id: offer.id || offer._id || offer.offer_id,
  }))
);
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
    company_name: 'Budget Progetto',
    name: currentEstimate.value?.name || 'Preventivo di Progetto',
    status: 'baseline',
    total_amount: baselineTotal.value,
    deltaAmount: 0,
    deltaPerc: 0,
    alertCount: 0,
    isBest: false,
    isBaseline: true,
    file_name: currentEstimate.value?.file_name,
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
      file_name: (offer as any).file_name,
    });
  });

  return rows;
});

// Grid configuration for unified table
const unifiedGridConfig: DataGridConfig = {
  columns: [
    {
      field: 'name',
      headerName: 'Riferimento',
      flex: 2,
      minWidth: 280,
      cellRenderer: (params: any): string => {
        const row = params.data;
        if (!row) return '';
        
        const isBaseline = row.isBaseline;
        const typeLabel = isBaseline ? 'Baseline' : 'Offerta';
        const typeColor = isBaseline 
          ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' 
          : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]';
        
        const fileName = row.file_name || '';
        const name = params.value || '';
        
        return `
          <div class="flex flex-col py-1 gap-0.5">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold px-1.5 py-0.5 rounded ${typeColor}">${typeLabel}</span>
              <span class="font-medium text-[hsl(var(--foreground))]">${name}</span>
            </div>
            ${fileName ? `<span class="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1"><i class="i-heroicons-paper-clip w-3 h-3"></i> ${fileName}</span>` : ''}
          </div>
        `;
      },
      autoHeight: true,
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
      cellRenderer: (params: any): string => {
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
      valueFormatter: (params: any): string => formatCurrency(params.value as number),
    },
    {
      field: 'deltaAmount',
      headerName: 'Δ Importo',
      width: 140,
      cellClass: 'ag-right-aligned-cell',
      cellRenderer: (params: any): string => {
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
      cellRenderer: (params: any): string => {
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
      cellRenderer: (params: any): string => {
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
      suppressHeaderMenuButton: true,
      suppressHeaderContextMenu: true,
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
    if (params.data?.isBaseline) return 'bg-[hsl(var(--primary)/0.1)] font-medium border-l-4 border-l-[hsl(var(--primary))]';
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

const isBaselineRow = (row: OfferRow | null | undefined) => {
  if (!row) return true;
  if (row.isBaseline) return true;
  if (row.rowType === 'project') return true;
  if (row.id === 'project-baseline') return true;
  return false;
};

const getOfferId = (row: OfferRow | null | undefined) => {
  if (!row) return undefined;
  return row.id || (row as any).offer_id || (row as any)._id;
};

const navigateToPricelist = (row: OfferRow | null | undefined) => {
  if (!row) return;
  const params = new URLSearchParams();

  params.set('estimateId', estimateId.value);

  if (!isBaselineRow(row)) {
    const offerId = getOfferId(row);
    if (offerId) params.set('offerId', offerId);
    if (row.round_number !== null && row.round_number !== undefined) {
      params.set('round', String(row.round_number));
    }
    if (row.company_name) {
      params.set('company', String(row.company_name));
    }
    if (row.deltaPerc !== null && row.deltaPerc !== undefined) {
      const deltaPerc = Number(row.deltaPerc);
      if (!Number.isNaN(deltaPerc)) params.set('deltaPerc', String(deltaPerc));
    }
    if (row.deltaAmount !== null && row.deltaAmount !== undefined) {
      const deltaAmount = Number(row.deltaAmount);
      if (!Number.isNaN(deltaAmount)) params.set('deltaAmount', String(deltaAmount));
    }
  }

  navigateTo(`/projects/${projectId.value}/pricelist?${params.toString()}`);
};

const openOfferDetail = (row: OfferRow | null | undefined) => {
   if (!row || isBaselineRow(row)) return;
   const params = new URLSearchParams();
   if (row.round_number !== undefined) params.set('round', String(row.round_number));
   if (row.company_name) params.set('company', row.company_name);
   navigateTo(`/projects/${projectId.value}/estimate/${estimateId.value}/offer?${params.toString()}`);
};

const openEditOffer = (row: OfferRow | null | undefined) => {
  if (!row || isBaselineRow(row)) return;
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
  if (!row?.id || isBaselineRow(row)) {
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
    await $fetch(`/api/projects/${projectId.value}/offers/${row.id}`, { method: 'DELETE' });
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
    await $fetch(`/api/projects/${projectId.value}/estimates/${estimateId.value}`, {
      method: "DELETE",
    });
    // Redirect to project dashboard after deletion
    navigateTo(`/projects/${projectId.value}`);
  } catch (error) {
    console.error("Errore durante l'eliminazione del preventivo", error);
    window.alert("Si è verificato un errore durante l'eliminazione del preventivo.");
  }
};

const gridContext = computed(() => ({
  rowActions: {
    viewPricelist: (row: OfferRow) => navigateToPricelist(row),
    viewOffer: (row: OfferRow) => openOfferDetail(row),
    resolve: () => navigateTo(`/projects/${projectId.value}/conflicts?estimateId=${estimateId.value}`), // Should filter by offer?
    edit: (row: OfferRow) => isBaselineRow(row) ? null : openEditOffer(row),
    remove: (row: OfferRow) => isBaselineRow(row) ? deleteEstimate() : openDeleteModal(row),
  },
  // Helper to determine if resolution is needed
  hasAlerts: (row: OfferRow) => (alertSummaryMap.value[row.id] || 0) > 0,
  // Dynamic visibility logic
  isActionVisible: (action: string, row: OfferRow | undefined) => {
    if (!row) return false;
    const isBaseline = isBaselineRow(row);
    
    switch (action) {
      case 'viewOffer': // Prevent viewing document for baseline (it's virtual/aggregated)
      case 'edit':      // Prevent editing baseline row from here
        return !isBaseline;
      case 'remove':    // Allow removing both offers and the estimate itself (via baseline)
      case 'viewPricelist': // Allow viewing pricelist for both
      case 'resolve':   // Allow resolving alerts for both (if alerts exist)
      default:
        return true;
    }
  }
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
    icon: 'i-heroicons-arrow-up-tray',
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
    handler: () => { navigateTo(`/projects/${projectId}/estimate/${estimateId}/comparison`) },
  });

  registerAction({
    id: 'estimate.importOffers',
    label: 'Importa offerte',
    description: 'Apri la procedura di import offerte',
    category: 'Preventivi',
    scope: 'estimate',
    icon: 'i-heroicons-arrow-down-tray',
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
    handler: () => { navigateTo(`/projects/${projectId}/conflicts?estimateId=${estimateId}`) },
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
      title="Confronto Offerte"
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
            <CountBadge :value="formatCurrency(baselineTotal)" label="Importo Baseline" icon="i-heroicons-banknotes" color="primary" />
            <CountBadge :value="offersCount" label="Offerte" icon="i-heroicons-document-text" />
         </div>
      </template>

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
                size="xs"
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
              centered
            >
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
