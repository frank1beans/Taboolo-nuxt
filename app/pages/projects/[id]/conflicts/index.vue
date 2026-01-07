<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted  } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MainPage from '~/components/layout/MainPage.vue';
import PageHeader from '~/components/layout/PageHeader.vue';
import { offersApi } from '~/lib/api';
import type { ApiOfferAddendumItem, ApiOfferAlert, ApiOfferSummary } from '~/types/api';
import type { Project } from '#types';
import ConflictsTable from '~/components/conflicts/ConflictsTable.vue';
import AssetsModule from '~/components/sidebar/modules/AssetsModule.vue';
import ConflictsFilterModule from '~/components/sidebar/modules/ConflictsFilterModule.vue';
import ConflictDetailModule from '~/components/sidebar/modules/ConflictDetailModule.vue';
import ConflictActionsModule from '~/components/sidebar/modules/ConflictActionsModule.vue';
import { useProjectTree } from '~/composables/useProjectTree';
import { useSidebarModules } from '~/composables/useSidebarModules';
import { useSidebarLayout } from '~/composables/useSidebarLayout';
import { useActionsStore } from '~/stores/actions';
import type { Action } from '~/types/actions';

definePageMeta({
  breadcrumb: 'Centro conflitti',
  disableDefaultSidebar: true,
});

const route = useRoute();
const router = useRouter();
const projectId = route.params.id as string;
const actionsStore = useActionsStore();
const actionOwner = 'page:conflicts-index';

const { data: context, status: contextStatus } = await useFetch<Project>(
  `/api/projects/${projectId}/context`,
  { 
    key: `project-context-${projectId}-conflicts`,
    immediate: !!projectId
  },
);

// Navigation Tree
const currentEstimate = computed(() => {
  if (!context.value?.estimates || selectedEstimateId.value === 'all') return undefined;
  return context.value.estimates.find(e => e.id === selectedEstimateId.value);
});

const { treeNodes } = useProjectTree(context, currentEstimate);

// Sidebar management
const { registerModule, unregisterModule, setActiveModule } = useSidebarModules();
const { showDefaultSidebar } = useSidebarLayout();

const moduleIds = ['conflicts-assets', 'conflicts-filters', 'conflicts-detail', 'conflicts-actions'];

onMounted(() => {
  // Activate Assets module by default so user can see their position
  setActiveModule('conflicts-assets')
  
  // 1. Assets (Navigation)
  registerModule({
    id: 'conflicts-assets',
    label: 'Assets',
    icon: 'heroicons:folder-open',
    order: 0,
    component: AssetsModule,
    props: {
      nodes: treeNodes,
      activeNodeId: computed(() => {
        if (selectedEstimateId.value && selectedEstimateId.value !== 'all') {
          return `estimate-${selectedEstimateId.value}`
        }
        return context.value ? `project-${projectId}` : null
      }),
      hasProject: computed(() => !!context.value),
      loading: computed(() => contextStatus.value === 'pending'),
    }
  });

  // 2. Filters
  registerModule({
    id: 'conflicts-filters',
    label: 'Filtri',
    icon: 'i-heroicons-funnel',
    order: 1,
    component: ConflictsFilterModule,
    props: {
        selectedEstimateId,
        selectedOfferId,
        selectedType,
        selectedStatus,
        estimateOptions,
        offerOptions,
        typeOptions,
        statusOptions,
        alertCount: alertSummaryTotal,
        pendingCount: computed(() => pendingItems.value.length),
        addendumCount: computed(() => addendumItems.value.length),
        loading,
        offersDisabled: computed(() => !offers.value.length || selectedEstimateId.value === 'all'),
        // Events
        'onUpdate:selectedEstimateId': (v: string) => selectedEstimateId.value = v,
        'onUpdate:selectedOfferId': (v: string) => selectedOfferId.value = v,
        'onUpdate:selectedType': (v: string) => selectedType.value = v,
        'onUpdate:selectedStatus': (v: string) => selectedStatus.value = v,
        'onRefresh': refreshAll,
        // Stats navigation
        'onOpenPending': () => router.push(`/projects/${projectId}/offers/pending`), // Assuming route exists or handled
        'onOpenAddendum': () => router.push(`/projects/${projectId}/offers/addendum`), // Assuming route exists or handled
    },
  });

  // 3. Detail (Dynamic)
  registerModule({
    id: 'conflicts-detail',
    label: 'Dettagli',
    icon: 'i-heroicons-document-magnifying-glass',
    order: 2,
    component: ConflictDetailModule,
    props: {
      selectedAlert: selectedDetailAlert,
      estimateName: computed(() => selectedDetailAlert.value ? getEstimateLabel(selectedDetailAlert.value.estimate_id) : undefined),
      offerName: computed(() => selectedDetailAlert.value ? getOfferLabel(selectedDetailAlert.value.offer_id) : undefined),
      'onCloseDetail': () => selectedDetailAlert.value = null,
      onResolve: (a: ApiOfferAlert) => updateAlertStatus(a, 'resolved'),
      onIgnore: (a: ApiOfferAlert) => updateAlertStatus(a, 'ignored'),
      onReopen: (a: ApiOfferAlert) => updateAlertStatus(a, 'open'),
      'onResolveWithCandidate': (_alert: ApiOfferAlert, _candidateId: string) => {
        refreshAlerts();
        selectedDetailAlert.value = null;
      },
    }
  });

  // 4. Actions (Dynamic)
  registerModule({
     id: 'conflicts-actions',
     label: 'Azioni rapide',
     icon: 'i-heroicons-bolt',
     order: 3,
     component: ConflictActionsModule,
     props: {
       selectedCount: computed(() => selectedAlerts.value.length),
     }
  });

  const registerAction = (action: Action) => {
    actionsStore.registerAction(action, { owner: actionOwner, overwrite: true });
  };

  registerAction({
    id: 'conflicts.refresh',
    label: 'Aggiorna conflitti',
    description: 'Ricarica conflitti e stati',
    category: 'Conflitti',
    scope: 'project',
    icon: 'i-heroicons-arrow-path',
    keywords: ['refresh', 'conflitti'],
    handler: () => refreshAll(),
  });

  registerAction({
    id: 'conflicts.applyAllPrices',
    label: 'Applica prezzo a tutti',
    description: 'Applica prezzo di listino ai conflitti filtrati',
    category: 'Conflitti',
    scope: 'project',
    icon: 'i-heroicons-currency-euro',
    tone: 'warning',
    keywords: ['prezzi', 'batch'],
    isEnabled: () => canApplyAll.value,
    disabledReason: 'Nessun conflitto applicabile',
    handler: () => applyAllPrices(),
  });

  registerAction({
    id: 'conflicts.batchResolve',
    label: 'Risolvi selezionati',
    description: 'Risolvi i conflitti selezionati',
    category: 'Conflitti',
    scope: 'selection',
    icon: 'i-heroicons-check',
    tone: 'success',
    keywords: ['resolve', 'batch'],
    isEnabled: () => selectedAlerts.value.length > 0,
    disabledReason: 'Nessun conflitto selezionato',
    handler: () => batchResolve(),
  });

  registerAction({
    id: 'conflicts.batchIgnore',
    label: 'Ignora selezionati',
    description: 'Ignora i conflitti selezionati',
    category: 'Conflitti',
    scope: 'selection',
    icon: 'i-heroicons-eye-slash',
    keywords: ['ignore', 'batch'],
    isEnabled: () => selectedAlerts.value.length > 0,
    disabledReason: 'Nessun conflitto selezionato',
    handler: () => batchIgnore(),
  });

  registerAction({
    id: 'conflicts.batchApplyPrices',
    label: 'Applica prezzo ai selezionati',
    description: 'Applica prezzo di listino ai conflitti selezionati',
    category: 'Conflitti',
    scope: 'selection',
    icon: 'i-heroicons-currency-euro',
    tone: 'warning',
    keywords: ['prezzi', 'batch'],
    isEnabled: () => selectedAlerts.value.length > 0 && onlyPriceMismatches.value,
    disabledReason: 'Seleziona solo conflitti prezzo',
    handler: () => batchApplyPrices(),
  });

  registerAction({
    id: 'conflicts.openPending',
    label: 'Apri offerte pending',
    description: 'Vai alla lista offerte pending',
    category: 'Conflitti',
    scope: 'project',
    icon: 'i-heroicons-clock',
    keywords: ['pending', 'offerte'],
    handler: () => router.push(`/projects/${projectId}/offers/pending`),
  });

  registerAction({
    id: 'conflicts.openAddendum',
    label: 'Apri addendum',
    description: 'Vai alla lista addendum',
    category: 'Conflitti',
    scope: 'project',
    icon: 'i-heroicons-document-plus',
    keywords: ['addendum', 'offerte'],
    handler: () => router.push(`/projects/${projectId}/offers/addendum`),
  });
});

onUnmounted(() => {
  moduleIds.forEach(id => unregisterModule(id));
  actionsStore.unregisterOwner(actionOwner);
});

const estimates = computed(() => context.value?.estimates ?? []);

const readQueryValue = (value: unknown, fallback = 'all') =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback;

const selectedEstimateId = ref<string>(readQueryValue(route.query.estimateId));
const selectedOfferId = ref<string>(readQueryValue(route.query.offerId));
const selectedType = ref<string>(readQueryValue(route.query.type));
const selectedStatus = ref<string>(readQueryValue(route.query.status, 'open'));

watch(
  () => route.query,
  (query) => {
    const nextEstimate = readQueryValue(query.estimateId);
    const nextOffer = readQueryValue(query.offerId);
    const nextType = readQueryValue(query.type);
    const nextStatus = readQueryValue(query.status, 'open');

    if (selectedEstimateId.value !== nextEstimate) selectedEstimateId.value = nextEstimate;
    if (selectedOfferId.value !== nextOffer) selectedOfferId.value = nextOffer;
    if (selectedType.value !== nextType) selectedType.value = nextType;
    if (selectedStatus.value !== nextStatus) selectedStatus.value = nextStatus;
  },
);

watch(
  estimates,
  (list) => {
    if (contextStatus.value === 'pending') return;
    if (!list.length) return;
    if (selectedEstimateId.value === 'all') return;
    if (!list.some((est) => est.id === selectedEstimateId.value)) {
      selectedEstimateId.value = 'all';
    }
  },
  { immediate: true },
);

const offersUrl = computed(() => {
  const params = new URLSearchParams();
  if (selectedEstimateId.value !== 'all') {
    params.set('estimate_id', selectedEstimateId.value);
  }
  const suffix = params.toString();
  return `/api/projects/${projectId}/offers${suffix ? `?${suffix}` : ''}`;
});

const { data: offersData, status: offersStatus } = await useFetch<{ offers: ApiOfferSummary[] }>(
  offersUrl,
  { 
    watch: [offersUrl],
    immediate: !!projectId
  },
);

const offers = computed(() => offersData.value?.offers || []);

watch(
  [offers, offersStatus],
  ([list, status]) => {
    if (status === 'pending') return;
    if (selectedOfferId.value === 'all') return;
    if (!list.some((offer) => offer.id === selectedOfferId.value)) {
      selectedOfferId.value = 'all';
    }
  },
  { immediate: true },
);

watch([selectedEstimateId, selectedOfferId, selectedType, selectedStatus], () => {
  if (!import.meta.client) return;
  const query: Record<string, string> = {};
  if (selectedEstimateId.value !== 'all') query.estimateId = selectedEstimateId.value;
  if (selectedOfferId.value !== 'all') query.offerId = selectedOfferId.value;
  if (selectedType.value !== 'all') query.type = selectedType.value;
  if (selectedStatus.value !== 'open') query.status = selectedStatus.value;
  router.replace({ query });
});

const alertFilters = computed(() => {
  const params = new URLSearchParams();
  if (selectedEstimateId.value !== 'all') params.set('estimate_id', selectedEstimateId.value);
  if (selectedOfferId.value !== 'all') params.set('offer_id', selectedOfferId.value);
  if (selectedType.value !== 'all') params.set('type', selectedType.value);
  if (selectedStatus.value !== 'all') params.set('status', selectedStatus.value);
  const suffix = params.toString();
  return `/api/projects/${projectId}/offers/alerts${suffix ? `?${suffix}` : ''}`;
});

const {
  data: alertsData,
  status: alertsStatus,
  refresh: refreshAlerts,
} = await useFetch<{ alerts: ApiOfferAlert[] }>(alertFilters, {
  watch: [alertFilters],
  immediate: !!projectId
});

const alerts = computed(() => alertsData.value?.alerts || []);

const alertSummaryTotal = computed(() => alerts.value.length);

const offerMap = computed<Record<string, ApiOfferSummary>>(() => {
  const map: Record<string, ApiOfferSummary> = {};
  offers.value.forEach((offer) => {
    map[offer.id] = offer;
  });
  return map;
});

const estimateMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  estimates.value.forEach((est) => {
    map[est.id] = est.name;
  });
  return map;
});

const selectedEstimateName = computed(() => {
  if (selectedEstimateId.value === 'all') return null;
  return estimateMap.value[selectedEstimateId.value] || null;
});

const selectedOffer = computed(() => {
  if (selectedOfferId.value === 'all') return null;
  return offerMap.value[selectedOfferId.value] || null;
});

const formatOfferLabel = (offer: ApiOfferSummary) => {
  const roundLabel = offer.round_number !== null && offer.round_number !== undefined
    ? `R${offer.round_number}`
    : 'R?';
  const companyLabel = offer.company_name || offer.name || 'Offerta';
  return `${roundLabel} - ${companyLabel}`;
};

const getOfferLabel = (offerId?: string | null) => {
  if (!offerId) return 'Offerta';
  const offer = offerMap.value[offerId];
  return offer ? formatOfferLabel(offer) : offerId;
};

const getEstimateLabel = (estimateId?: string | null) => {
  if (!estimateId) return null;
  return estimateMap.value[estimateId] || estimateId;
};

// handleNavigate removed (replaced by sidebar version)

// ... existing code ...
const updatingAlertId = ref<string | null>(null);
const updateAlertStatus = async (alert: ApiOfferAlert, status: 'open' | 'resolved' | 'ignored') => {
  if (!alert?.id) return;
  updatingAlertId.value = alert.id;
  try {
    await offersApi.resolveAlert(projectId, alert.id, { status });
    await refreshAlerts();
    // If sidebar is open for this alert, refresh it or close it?
    // If resolved/ignored, maybe keep open but update status (which happens automatically if alert object in list updates)
    if (selectedDetailAlert.value?.id === alert.id) {
       // update local state of selectedDetailAlert if needed, but it should be reactive from 'alerts' if we find it
       const updated = alerts.value.find(a => a.id === alert.id);
       if (updated) selectedDetailAlert.value = updated;
    }
  } catch (err) {
    console.error('Failed to update alert status', err);
  } finally {
    updatingAlertId.value = null;
  }
};

// Sidebar & Selection
const selectedDetailAlert = ref<ApiOfferAlert | null>(null);
const selectedAlerts = ref<ApiOfferAlert[]>([]);

const handleNavigate = (alert: ApiOfferAlert) => {
  selectedDetailAlert.value = alert;
};

const handleSelectionChanged = (alerts: ApiOfferAlert[]) => {
  selectedAlerts.value = alerts;
};

const applyPricesToItems = async (items: ApiOfferAlert[]) => {
  // Filter only open price mismatches if we are applying to All
  const targets = items.filter(a => a.type === 'price_mismatch' && a.status !== 'resolved');
  
  if (targets.length === 0) return;

  console.log(`[Batch] Applying prices to ${targets.length} items...`);
  const chunkSize = 10;
  for (let i = 0; i < targets.length; i += chunkSize) {
    const chunk = targets.slice(i, i + chunkSize);
    const promises = chunk.map(a => 
      offersApi.resolveAlert(projectId, a.id, { 
        status: 'resolved', 
        apply_approved_price: true 
      })
    );
    
    // Use allSettled to ensure all requests run
    const results = await Promise.allSettled(promises);
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.error(`[Batch] ${failed.length}/${chunk.length} requests failed in chunk`, failed);
    }
  }
  
  await refreshAlerts();
  selectedAlerts.value = [];
};

const batchApplyPrices = async () => {
  if (!confirm(`Vuoi applicare il prezzo di listino a ${selectedAlerts.value.length} offerte selezionate?`)) return;
  await applyPricesToItems(selectedAlerts.value);
};

const canApplyAll = computed(() => 
  selectedType.value === 'price_mismatch' && 
  alerts.value.length > 0 && 
  // Show only if there are open alerts
  alerts.value.some(a => a.status === 'open')
);

const applyAllPrices = async () => {
   const count = alerts.value.filter(a => a.status === 'open').length;
   if (!confirm(`Vuoi applicare il prezzo di listino a TUTTI i ${count} conflitti visualizzati?`)) return;
   await applyPricesToItems(alerts.value);
};

const batchResolve = async () => {
  if (!confirm(`Sei sicuro di voler risolvere ${selectedAlerts.value.length} conflitti?`)) return;
  
  // Sequential or Parallel? Parallel is faster.
  const promises = selectedAlerts.value.map(a => 
      offersApi.resolveAlert(projectId, a.id, { status: 'resolved' })
  );
  
  const results = await Promise.allSettled(promises);
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    console.error(`[Batch Resolve] ${failed.length} requests failed`, failed);
  }

  await refreshAlerts();
  selectedAlerts.value = []; // Clear selection? Or keep?
};

const batchIgnore = async () => {
  if (!confirm(`Sei sicuro di voler ignorare ${selectedAlerts.value.length} conflitti?`)) return;
  
  const promises = selectedAlerts.value.map(a => 
      offersApi.resolveAlert(projectId, a.id, { status: 'ignored' })
  );
  
  const results = await Promise.allSettled(promises);
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    console.error(`[Batch Ignore] ${failed.length} requests failed`, failed);
  }
  await refreshAlerts();
  selectedAlerts.value = [];
};

const onlyPriceMismatches = computed(() => 
  selectedAlerts.value.length > 0 && 
  selectedAlerts.value.every(a => a.type === 'price_mismatch')
);



const selectedEstimateKey = computed(() =>
  selectedEstimateId.value !== 'all' ? selectedEstimateId.value : null,
);

const pendingUrl = computed(() => {
  if (!selectedEstimateKey.value) return '';
  const params = new URLSearchParams();
  params.set('estimate_id', selectedEstimateKey.value);
  if (selectedOffer.value?.round_number !== null && selectedOffer.value?.round_number !== undefined) {
    params.set('round', String(selectedOffer.value.round_number));
  }
  if (selectedOffer.value?.company_name) {
    params.set('company', selectedOffer.value.company_name);
  }
  return `/api/projects/${projectId}/offers/pending?${params.toString()}`;
});

const {
  data: pendingData,
  refresh: refreshPending,
} = await useFetch<{ items: Array<{ id: string }> }>(pendingUrl, {
  immediate: false,
  watch: [pendingUrl],
});

watch(
  pendingUrl,
  (url) => {
    if (url) refreshPending();
  },
  { immediate: true },
);

const pendingItems = computed(() => pendingData.value?.items || []);

const addendumUrl = computed(() => {
  if (!selectedEstimateKey.value) return '';
  const params = new URLSearchParams();
  params.set('estimate_id', selectedEstimateKey.value);
  if (selectedOffer.value?.round_number !== null && selectedOffer.value?.round_number !== undefined) {
    params.set('round', String(selectedOffer.value.round_number));
  }
  if (selectedOffer.value?.company_name) {
    params.set('company', selectedOffer.value.company_name);
  }
  return `/api/projects/${projectId}/offers/addendum?${params.toString()}`;
});

const {
  data: addendumData,
  refresh: refreshAddendum,
} = await useFetch<{ items: ApiOfferAddendumItem[] }>(addendumUrl, {
  immediate: false,
  watch: [addendumUrl],
});

watch(
  addendumUrl,
  (url) => {
    if (url) refreshAddendum();
  },
  { immediate: true },
);

const addendumItems = computed(() => addendumData.value?.items || []);

const estimateOptions = computed(() => [
  { label: 'Tutti i preventivi', value: 'all' },
  ...estimates.value.map((est) => ({ label: est.name, value: est.id })),
]);

const offerOptions = computed(() => [
  { label: 'Tutte le offerte', value: 'all' },
  ...offers.value.map((offer) => ({ label: formatOfferLabel(offer), value: offer.id })),
]);

const typeOptions = [
  { label: 'Tutti i tipi', value: 'all' },
  { label: 'Prezzo', value: 'price_mismatch' },
  { label: 'Quantita', value: 'quantity_mismatch' },
  { label: 'Codice', value: 'code_mismatch' },
  { label: 'Baseline', value: 'missing_baseline' },
  { label: 'Ambiguo', value: 'ambiguous_match' },
  { label: 'Addendum', value: 'addendum' },
];

const statusOptions = [
  { label: 'Aperti', value: 'open' },
  { label: 'Risolti', value: 'resolved' },
  { label: 'Ignorati', value: 'ignored' },
  { label: 'Tutti', value: 'all' },
];

const loading = computed(
  () =>
    contextStatus.value === 'pending'
    || offersStatus.value === 'pending'
    || alertsStatus.value === 'pending',
);

const refreshAll = async () => {
  await Promise.all([refreshAlerts(), refreshPending(), refreshAddendum()]);
};
</script>

<template>
  <MainPage :loading="loading">
    <!-- Simple Header -->
    <template #header>
      <PageHeader title="Centro conflitti" :divider="true">
        <template #meta>
          <div class="flex items-center gap-2">
            <span class="text-[hsl(var(--foreground))] font-medium">
              {{ context?.name || 'Progetto' }}
            </span>
            <span class="text-[hsl(var(--border))]">|</span>
            <span class="text-[hsl(var(--muted-foreground))]">
              {{ selectedEstimateName || 'Tutti i preventivi' }}
            </span>
          </div>
        </template>
      </PageHeader>
    </template>

    <!-- Main Content: Full Height Table -->
    <div class="flex-1 min-h-0 relative overflow-hidden flex flex-col h-full">
      <ConflictsTable
        :alerts="alerts"
        :loading="alertsStatus === 'pending'"
        :estimate-map="estimateMap"
        :offer-map="offerMap"
        class="flex-1"
        @resolve="(a) => updateAlertStatus(a, 'resolved')"
        @ignore="(a) => updateAlertStatus(a, 'ignored')"
        @reopen="(a) => updateAlertStatus(a, 'open')"
        @navigate="handleNavigate"
        @selection-changed="handleSelectionChanged"
      />

    </div>
  </MainPage>
</template>
