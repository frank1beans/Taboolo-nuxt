<script setup lang="ts">
import { ref, computed, defineAsyncComponent, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '~/lib/api-client';
import type { ApiSixEstimatesPreview, ApiEstimate, ApiXpweEstimatesPreview, ApiSixImportReport, ApiSixEstimateOption, ApiRawPreventivo } from '~/types/api';
import FileDropZone from '~/components/ui/FileDropZone.vue';
import ImportStatusCard from '~/components/ui/ImportStatusCard.vue';
import PageHeader from '~/components/layout/PageHeader.vue';
import MainPage from '~/components/layout/MainPage.vue';
import { useActionsStore } from '~/stores/actions';
import type { Action } from '~/types/actions';

// Lazy load heavy ImportWizard component (31KB)
const ImportWizard = defineAsyncComponent(() => import('~/components/projects/ImportWizard.vue'));

const route = useRoute();
const router = useRouter();
const projectId = route.params.id as string;
const actionsStore = useActionsStore();
const actionOwner = 'page:project-import';

definePageMeta({});

const registerAction = (action: Action) => {
  actionsStore.registerAction(action, { owner: actionOwner, overwrite: true });
};

onMounted(() => {
  registerAction({
    id: 'import.goToProject',
    label: 'Torna al progetto',
    description: 'Ritorna alla dashboard del progetto',
    category: 'Import',
    scope: 'project',
    icon: 'i-heroicons-arrow-left',
    keywords: ['progetto', 'indietro'],
    handler: () => navigateToProject(),
  });

  registerAction({
    id: 'import.confirmSix',
    label: 'Conferma import SIX',
    description: 'Esegue import del file SIX',
    category: 'Import',
    scope: 'project',
    icon: 'i-heroicons-check',
    keywords: ['six', 'import'],
    isEnabled: () => Boolean(sixFile.value),
    disabledReason: 'Nessun file SIX caricato',
    handler: () => confirmSixImport(),
  });

  registerAction({
    id: 'import.resetSix',
    label: 'Reset import SIX',
    description: 'Ripristina lo stato import SIX',
    category: 'Import',
    scope: 'project',
    icon: 'i-heroicons-arrow-path',
    keywords: ['six', 'reset'],
    handler: () => resetSix(),
  });

  registerAction({
    id: 'import.confirmXpwe',
    label: 'Conferma import XPWE',
    description: 'Esegue import del file XPWE',
    category: 'Import',
    scope: 'project',
    icon: 'i-heroicons-check',
    keywords: ['xpwe', 'import'],
    isEnabled: () => Boolean(xpweFile.value),
    disabledReason: 'Nessun file XPWE caricato',
    handler: () => confirmXpweImport(),
  });

  registerAction({
    id: 'import.resetXpwe',
    label: 'Reset import XPWE',
    description: 'Ripristina lo stato import XPWE',
    category: 'Import',
    scope: 'project',
    icon: 'i-heroicons-arrow-path',
    keywords: ['xpwe', 'reset'],
    handler: () => resetXpwe(),
  });
});

onUnmounted(() => {
  actionsStore.unregisterOwner(actionOwner);
});

const activeTab = ref(0);
const items = [{
  label: 'Computo SIX',
  icon: 'i-heroicons-document-text',
  slot: 'six',
  description: 'File .six o .xml da STR Vision'
}, {
  label: 'Computo XPWE',
  icon: 'i-heroicons-document-duplicate',
  slot: 'xpwe',
  description: 'File .xpwe da PriMus/ACCA'
}, {
  label: 'Offerta Excel',
  icon: 'i-heroicons-table-cells',
  slot: 'excel',
  description: 'Listino o offerte da foglio Excel'
}];

// --- PROCESSO SIX/XML ---
const sixFile = ref<File | null>(null);
const sixStatus = ref<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
const sixError = ref('');
const sixProgress = ref(0);
const sixPreview = ref<ApiSixEstimatesPreview | null>(null);
const selectedEstimateId = ref<string | undefined>(undefined);
const sixImportResult = ref<{ totalItems?: number; wbsNodes?: number; message?: string; estimateId?: string } | null>(null);
const useRawParser = ref(true); // Default to NEW parser

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === 'string') return err;
  return fallback;
};

const isApiReport = (value: unknown): value is ApiSixImportReport =>
  isRecord(value)
  && typeof value.items === 'number'
  && typeof value.wbs6 === 'number'
  && typeof value.wbs7 === 'number'
  && typeof value.spatial_wbs === 'number';

type RawImportResult = {
  estimate?: { items?: unknown[] };
  groups?: unknown[];
  rilevazioni?: Record<string, unknown>;
  estimateId?: string;
};

type PreviewSource = ApiSixEstimateOption | ApiRawPreventivo;

interface PreviewEstimate {
  id: string;
  label: string;
  count: number;
  totalAmount?: number;
  version?: string;
  author?: string;
  date?: string;
  priceListLabel?: string;
  uniqueProducts?: number;
  original: unknown;
}

const toPreviewEstimate = (item: PreviewSource): PreviewEstimate => {
  const stats = 'stats' in item && isRecord(item.stats) ? item.stats : undefined;
  const statsItems = stats?.items;
  const count = typeof statsItems === 'number'
    ? statsItems
    : ('items' in item && typeof item.items === 'number' ? item.items : 0);
  
  const statsTotal = stats?.total_amount;
  const totalAmount = typeof statsTotal === 'number'
    ? statsTotal
    : ('total_amount' in item && typeof item.total_amount === 'number' ? item.total_amount : undefined);
    
  const uniqueProducts = typeof stats?.unique_products === 'number' ? stats.unique_products : undefined;
    
  const extra = item as Record<string, unknown>;
  const importo = typeof extra.importo === 'number' ? extra.importo : undefined;
  const priceListLabel = typeof extra.price_list_label === 'string' ? extra.price_list_label : undefined;
  const dateStr = typeof extra.date === 'string' ? extra.date : undefined;

  return {
    id: 'preventivoId' in item ? item.preventivoId : item.internal_id,
    label: item.description || item.code || 'Senza nome',
    count,
    totalAmount: totalAmount ?? importo,
    version: 'version' in item ? item.version : undefined,
    author: 'author' in item ? item.author : undefined,
    date: dateStr,
    priceListLabel: priceListLabel,
    uniqueProducts,
    original: item
  };
};

const previewEstimates = computed<PreviewEstimate[]>(() => {
  if (!sixPreview.value) return [];
  const list = (sixPreview.value.preventivi || sixPreview.value.estimates || []) as PreviewSource[];
  return list.map(toPreviewEstimate);
});

const handleSixFileSelect = async (file: File) => {
  sixFile.value = file;
  sixStatus.value = 'processing';
  sixError.value = '';
  sixProgress.value = 30;

  try {
    const preview = await api.previewSixEstimates(projectId, file, { 
      raw: useRawParser.value 
    });
    
    sixPreview.value = preview;
    
    // Auto-select if only one
    // Access computed value safely
    const estimates = previewEstimates.value;
    if (estimates.length === 1) {
      selectedEstimateId.value = estimates[0]?.id ?? undefined;
    } else {
      selectedEstimateId.value = undefined;
    }
    
    sixStatus.value = 'idle'; // Back to idle (but with file loaded) to show confirm UI
    sixProgress.value = 100;
  } catch (err: unknown) {
    sixStatus.value = 'error';
    sixError.value = getErrorMessage(err, 'Errore durante l\'analisi del file SIX.');
    console.error(err);  
  }
};


const enableEmbeddings = ref(false);

const confirmSixImport = async () => {
  if (!sixFile.value) return;

  sixStatus.value = 'uploading';
  sixProgress.value = 10;
  
  // Fake progress
  const interval = setInterval(() => {
    if (sixProgress.value < 90) sixProgress.value += 10;
  }, 300);

  try {
    const result: ApiSixImportReport | RawImportResult = await api.importSixFile(
      projectId,
      sixFile.value,
      selectedEstimateId.value,
      {
      enableEmbeddings: enableEmbeddings.value,
      enablePropertyExtraction: false,
      raw: useRawParser.value
    });
    
    clearInterval(interval);
    sixProgress.value = 100;
    
    // Calculate stats based on result type (Raw vs Legacy)
    let totalItems = 0;
    let wbsNodes = 0;

    if (isApiReport(result)) {
      totalItems = result.items ?? 0;
      wbsNodes = (result.wbs6 ?? 0) + (result.wbs7 ?? 0) + (result.spatial_wbs ?? 0);
    } else if (useRawParser.value && isRecord(result) && 'estimate' in result) {
      // NEW ImportResult Schema
      // result = { project, groups, price_list, estimate }
      const rawResult = result as RawImportResult;
      const estimateItems = Array.isArray(rawResult.estimate?.items) ? rawResult.estimate?.items.length : 0;
      totalItems = estimateItems;
      wbsNodes = Array.isArray(rawResult.groups) ? rawResult.groups.length : 0;
    } else if (useRawParser.value && isRecord(result) && 'rilevazioni' in result) {
      // Raw Payload (Legacy fallback if needed, but we removed it)
      const rawResult = result as RawImportResult;
      const detections = rawResult.rilevazioni;
      const values = isRecord(detections) ? Object.values(detections) : [];
      totalItems = values.reduce((acc: number, value) => (Array.isArray(value) ? acc + value.length : acc), 0);
      wbsNodes = Array.isArray(rawResult.groups) ? rawResult.groups.length : 0;
    } else {
      // Legacy Report
      totalItems = 0;
      wbsNodes = 0;
    }
    
    // Extract estimateId if available (added in recent backend update)
    const estimateId = isRecord(result) ? (result as RawImportResult).estimateId : undefined;
    
    sixImportResult.value = {
      totalItems: totalItems,
      wbsNodes: wbsNodes,
      message: 'Computo importato con successo.',
      estimateId: estimateId
    };
    sixStatus.value = 'success';
  } catch (err: unknown) {
    clearInterval(interval);
    sixStatus.value = 'error';
    sixError.value = getErrorMessage(err, 'Errore durante l\'importazione finale.');
  }
};

const resetSix = () => {
  sixFile.value = null;
  sixStatus.value = 'idle';
  sixError.value = '';
  sixPreview.value = null;
  selectedEstimateId.value = undefined;
  sixImportResult.value = null;
  enableEmbeddings.value = false;
};

// --- PROCESSO XPWE ---
const xpweFile = ref<File | null>(null);
const xpweStatus = ref<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
const xpweError = ref('');
const xpweProgress = ref(0);
const xpwePreview = ref<ApiXpweEstimatesPreview | null>(null);
const selectedXpweEstimateId = ref<string | undefined>(undefined);
const xpweImportResult = ref<{ totalItems?: number; wbsNodes?: number; message?: string } | null>(null);
const xpweUseRawParser = ref(true);

const previewXpweEstimates = computed<PreviewEstimate[]>(() => {
  if (!xpwePreview.value) return [];
  const list = (xpwePreview.value.preventivi || xpwePreview.value.estimates || []) as PreviewSource[];
  return list.map(toPreviewEstimate);
});

const handleXpweFileSelect = async (file: File) => {
  xpweFile.value = file;
  xpweStatus.value = 'processing';
  xpweError.value = '';
  xpweProgress.value = 30;

  try {
    const preview = await api.previewXpweEstimates(projectId, file, {
      raw: xpweUseRawParser.value
    });

    xpwePreview.value = preview;

    const estimates = previewXpweEstimates.value;
    if (estimates.length === 1) {
      selectedXpweEstimateId.value = estimates[0]?.id ?? undefined;
    } else {
      selectedXpweEstimateId.value = undefined;
    }

    xpweStatus.value = 'idle';
    xpweProgress.value = 100;
  } catch (err: unknown) {
    xpweStatus.value = 'error';
    xpweError.value = getErrorMessage(err, 'Errore durante l\'analisi del file XPWE.');
  }
};

const xpweAvailableKinds = computed(() => {
  return xpwePreview.value?.wbs_structure || [];
});

const xpweWbsMapping = ref<Record<string, string>>({}); // Kind -> CanonicalCode

// Canonical levels definition for UI (Dynamic from Backend)
const canonicalSelectOptions = computed(() => {
  const options = [
    { value: "", label: "Ignora (Nessun mapping)" }
  ];
  
  if (xpwePreview.value?.canonical_levels) {
    const levels = xpwePreview.value.canonical_levels;
    // Sort keys to ensure order 01, 02...
    Object.keys(levels).sort().forEach(key => {
       const info = levels[key];
       if (info) {
        options.push({
          value: key,
          label: info.description || info.code
        });
       }
    });
  } else {
    // Fallback if not loaded yet (shouldn't happen in this view)
    options.push(
      { value: "01", label: "Lotto/Edificio" },
      { value: "02", label: "Livelli" },
      { value: "03", label: "Ambiti omogenei" },
      { value: "04", label: "Appalto" },
      { value: "05", label: "Elementi Funzionali" },
      { value: "06", label: "Categorie merceologiche" },
      { value: "07", label: "Raggruppatore EPU" }
    );
  }
  
  return options;
});

const confirmXpweImport = async () => {
  if (!xpweFile.value) return;

  xpweStatus.value = 'uploading';
  xpweProgress.value = 10;

  const interval = setInterval(() => {
    if (xpweProgress.value < 90) xpweProgress.value += 10;
  }, 300);

  try {
    const result = await api.importXpweFile(
      projectId,
      xpweFile.value,
      selectedXpweEstimateId.value,
      {
        raw: xpweUseRawParser.value,
        wbsMapping: xpweWbsMapping.value,
        enableEmbeddings: enableEmbeddings.value
      }
    );

    clearInterval(interval);
    xpweProgress.value = 100;

    let totalItems = 0;
    let wbsNodes = 0;

    if (isApiReport(result)) {
       totalItems = result.items ?? 0;
       wbsNodes = (result.wbs6 ?? 0) + (result.wbs7 ?? 0) + (result.spatial_wbs ?? 0);
    } else if (xpweUseRawParser.value && isRecord(result) && 'estimate' in result) {
      const rawResult = result as RawImportResult;
      const estimateItems = Array.isArray(rawResult.estimate?.items) ? rawResult.estimate?.items.length : 0;
      totalItems = estimateItems;
      wbsNodes = Array.isArray(rawResult.groups) ? rawResult.groups.length : 0;
    }

    xpweImportResult.value = {
      totalItems: totalItems,
      wbsNodes: wbsNodes,
      message: 'Computo XPWE importato con successo.'
    };
    xpweStatus.value = 'success';
  } catch (err: unknown) {
    clearInterval(interval);
    xpweStatus.value = 'error';
    xpweError.value = getErrorMessage(err, 'Errore durante l\'importazione del file XPWE.');
  }
};

const resetXpwe = () => {
  xpweFile.value = null;
  xpweStatus.value = 'idle';
  xpweError.value = '';
  xpwePreview.value = null;
  selectedXpweEstimateId.value = undefined;
  xpweImportResult.value = null;
  enableEmbeddings.value = false;
};

// --- GENERIC HELPERS ---
const handleExcelSuccess = (estimate: ApiEstimate) => {
  // Maybe show a toast or redirect?
  // For now just let the component show the success card
  console.log('Offer imported:', estimate);
};

const navigateToProject = () => {
  router.push(`/projects/${projectId}`);
};
</script>

<template>
  <MainPage :loading="false">
    <template #header>
      <PageHeader title="Importazione Dati" :divider="false">
        <template #leftSlot>
          <UButton
            icon="i-heroicons-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="navigateToProject"
          />
        </template>
      </PageHeader>
    </template>

    <template #default>
      <div class="flex-1 min-h-0 flex flex-col">
        <UTabs 
          v-model="activeTab" 
          :items="items" 
          class="w-full flex-1 flex flex-col min-h-0" 
          :ui="{ list: { background: 'bg-[hsl(var(--secondary))]' }, content: 'flex-1 min-h-0 overflow-y-auto custom-scrollbar' }"
        >
         
         <!-- TAB 1: SIX/XML -->
         <template #six>
            <div class="pt-4 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div class="max-w-3xl mx-auto space-y-6">
                 
                 <!-- Intro Section -->
                 <div class="text-center space-y-2">
                   <h2 class="text-xl font-semibold text-[hsl(var(--foreground))]">
                     Importa Computo da STR Vision
                   </h2>
                   <p class="text-sm text-[hsl(var(--muted-foreground))] max-w-lg mx-auto">
                     Carica un file <strong>.six</strong> o <strong>.xml</strong> esportato da STR Vision. 
                     Verranno estratti i preventivi con voci, quantità e struttura WBS.
                   </p>
                 </div>

                 <!-- Step 1: Upload -->
                 <div v-if="!sixFile || sixStatus === 'processing'">
                    <FileDropZone
                      accept=".six,.xml"
                      icon="i-heroicons-document-text"
                      label="Carica file .six o .xml"
                      sublabel="Trascina qui o clicca per selezionare"
                      :disabled="sixStatus === 'processing'"
                      @file-selected="handleSixFileSelect"
                      @error="(msg) => { sixError = msg; sixStatus = 'error'; }"
                    />
                    <div class="flex items-center justify-center gap-4 mt-4 text-xs text-[hsl(var(--muted-foreground))]">
                      <span class="flex items-center gap-1">
                        <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-emerald-500" />
                        Formati: .six, .xml
                      </span>
                      <span class="flex items-center gap-1">
                        <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
                        Estrazione automatica
                      </span>
                    </div>
                 </div>

                 <!-- Step 2: Preview & Confirm -->
                 <div v-if="sixFile && sixStatus === 'idle'" class="space-y-6">
                    
                    <!-- File Info Card -->
                    <div class="bg-[hsl(var(--secondary))] rounded-xl p-5 border border-[hsl(var(--border))]">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <UIcon name="i-heroicons-document-check" class="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p class="font-medium text-[hsl(var(--foreground))]">{{ sixFile.name }}</p>
                            <p class="text-xs text-[hsl(var(--muted-foreground))]">
                              File caricato correttamente
                            </p>
                          </div>
                        </div>
                        <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" size="sm" @click="resetSix" />
                      </div>
                    </div>

                    <!-- Estimate Selection -->
                    <div v-if="sixPreview && previewEstimates.length > 0" class="space-y-4">
                      <div class="flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">
                          Seleziona il preventivo da importare
                        </h3>
                        <UBadge color="primary" variant="soft" size="sm">
                          {{ previewEstimates.length }} {{ previewEstimates.length === 1 ? 'preventivo trovato' : 'preventivi trovati' }}
                        </UBadge>
                      </div>
                      
                      <!-- Estimate Cards -->
                      <div class="grid gap-3 max-h-[35vh] overflow-y-auto pr-2 custom-scrollbar">
                        <button
                          v-for="estimate in previewEstimates"
                          :key="estimate.id"
                          type="button"
                          class="w-full text-left p-4 rounded-xl border-2 transition-all duration-200"
                          :class="[
                            selectedEstimateId === estimate.id 
                              ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]' 
                              : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)] bg-[hsl(var(--card))]'
                          ]"
                          @click="selectedEstimateId = estimate.id"
                        >
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3 overflow-hidden">
                              <div 
                                class="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors"
                                :class="selectedEstimateId === estimate.id ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]' : 'border-[hsl(var(--muted-foreground))]'"
                              >
                                <UIcon v-if="selectedEstimateId === estimate.id" name="i-heroicons-check" class="w-3 h-3 text-white" />
                              </div>
                              <div class="min-w-0">
                                <p class="font-medium text-[hsl(var(--foreground))] truncate">{{ estimate.label }}</p>
                                <div class="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                                  <p v-if="estimate.priceListLabel" class="flex items-center gap-1">
                                    <UIcon name="i-heroicons-book-open" class="w-3 h-3" />
                                    {{ estimate.priceListLabel }}
                                  </p>
                                  <span v-if="estimate.priceListLabel && estimate.uniqueProducts">•</span>
                                  <p v-if="estimate.uniqueProducts">
                                    {{ estimate.uniqueProducts }} articoli
                                  </p>
                                  <span v-if="(estimate.priceListLabel || estimate.uniqueProducts) && estimate.version">•</span>
                                  <p v-if="estimate.version">
                                    Versione {{ estimate.version }}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div class="flex items-center gap-4 text-right flex-shrink-0 pl-4">
                              <div>
                                <p class="text-sm font-semibold text-[hsl(var(--foreground))] whitespace-nowrap">
                                  {{ estimate.count.toLocaleString('it-IT') }} voci
                                </p>
                                <p v-if="estimate.totalAmount" class="font-mono text-xs text-[hsl(var(--primary))] font-medium whitespace-nowrap">
                                  € {{ estimate.totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                                </p>
                              </div>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                   
                   <!-- No estimates found -->
                   <div v-else-if="sixPreview" class="text-center py-8">
                      <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-amber-500 mx-auto mb-3" />
                      <p class="text-[hsl(var(--foreground))] font-medium">Nessun preventivo trovato</p>
                      <p class="text-sm text-[hsl(var(--muted-foreground))]">Il file non contiene preventivi validi.</p>
                   </div>

                   <!-- Options -->
                   <div v-if="selectedEstimateId && sixPreview" class="bg-[hsl(var(--muted))] rounded-xl p-4 grid grid-cols-[1fr_auto] gap-4 items-center">
                     <div>
                       <p class="text-sm font-medium text-[hsl(var(--foreground))]">Genera Embedding AI</p>
                       <p class="text-xs text-[hsl(var(--muted-foreground))]">Abilita la ricerca semantica (richiede più tempo)</p>
                     </div>
                     <USwitch v-model="enableEmbeddings" color="primary" />
                   </div>

                   <!-- Action Button -->
                   <div v-if="selectedEstimateId" class="flex justify-end pt-2">
                      <UButton 
                        color="primary" 
                        size="lg"
                        icon="i-heroicons-arrow-down-tray" 
                        @click="confirmSixImport"
                      >
                        Importa Preventivo
                      </UButton>
                   </div>
                 </div>

                 <!-- Status Card -->
                 <ImportStatusCard
                   v-if="sixStatus !== 'idle'"
                   :status="sixStatus"
                   :file-name="sixFile?.name"
                   :progress="sixProgress"
                   :error-message="sixError"
                   :result="sixImportResult || undefined"
                   :action-label="sixImportResult?.estimateId ? 'Vedi Preventivo' : undefined"
                   @action="() => { if(sixImportResult?.estimateId) router.push(`/projects/${projectId}/estimate/${sixImportResult.estimateId}`) }"
                   @reset="resetSix"
                 />

              </div>
            </div>
         </template>

         <!-- TAB XPWE -->
         <template #xpwe>
            <div class="pt-4 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div class="max-w-3xl mx-auto space-y-6">

                 <!-- Intro Section -->
                 <div class="text-center space-y-2">
                   <h2 class="text-xl font-semibold text-[hsl(var(--foreground))]">
                     Importa Computo da PriMus/ACCA
                   </h2>
                   <p class="text-sm text-[hsl(var(--muted-foreground))] max-w-lg mx-auto">
                     Carica un file <strong>.xpwe</strong> esportato da PriMus o software ACCA. 
                     Potrai mappare i livelli WBS alla struttura standard.
                   </p>
                 </div>

                 <!-- Step 1: Upload -->
                 <div v-if="!xpweFile || xpweStatus === 'processing'">
                    <FileDropZone
                      accept=".xpwe,.xml"
                      icon="i-heroicons-document-duplicate"
                      label="Carica file .xpwe"
                      sublabel="Trascina qui o clicca per selezionare"
                      :disabled="xpweStatus === 'processing'"
                      @file-selected="handleXpweFileSelect"
                      @error="(msg) => { xpweError = msg; xpweStatus = 'error'; }"
                    />
                    <div class="flex items-center justify-center gap-4 mt-4 text-xs text-[hsl(var(--muted-foreground))]">
                      <span class="flex items-center gap-1">
                        <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-emerald-500" />
                        Formato: .xpwe, .xml
                      </span>
                      <span class="flex items-center gap-1">
                        <UIcon name="i-heroicons-arrows-right-left" class="w-4 h-4" />
                        Mappatura WBS inclusa
                      </span>
                    </div>
                 </div>

                 <!-- Step 2: Preview & Confirm -->
                 <div v-if="xpweFile && xpweStatus === 'idle'" class="space-y-6">
                    
                    <!-- File Info Card -->
                    <div class="bg-[hsl(var(--secondary))] rounded-xl p-5 border border-[hsl(var(--border))]">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <UIcon name="i-heroicons-document-check" class="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p class="font-medium text-[hsl(var(--foreground))]">{{ xpweFile.name }}</p>
                            <p class="text-xs text-[hsl(var(--muted-foreground))]">
                              File XPWE caricato correttamente
                            </p>
                          </div>
                        </div>
                        <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" size="sm" @click="resetXpwe" />
                      </div>
                    </div>

                    <!-- Estimate Selection -->
                    <div v-if="xpwePreview && previewXpweEstimates.length > 0" class="space-y-4">
                      <div class="flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">
                          Seleziona il preventivo da importare
                        </h3>
                        <UBadge color="primary" variant="soft" size="sm">
                          {{ previewXpweEstimates.length }} {{ previewXpweEstimates.length === 1 ? 'preventivo' : 'preventivi' }}
                        </UBadge>
                      </div>
                      
                      <!-- Estimate Cards -->
                      <div class="grid gap-3 max-h-[35vh] overflow-y-auto pr-2 custom-scrollbar">
                        <button
                          v-for="estimate in previewXpweEstimates"
                          :key="estimate.id"
                          type="button"
                          class="w-full text-left p-4 rounded-xl border-2 transition-all duration-200"
                          :class="[
                            selectedXpweEstimateId === estimate.id 
                              ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]' 
                              : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)] bg-[hsl(var(--card))]'
                          ]"
                          @click="selectedXpweEstimateId = estimate.id"
                        >
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                              <div 
                                class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                                :class="selectedXpweEstimateId === estimate.id ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]' : 'border-[hsl(var(--muted-foreground))]'"
                              >
                                <UIcon v-if="selectedXpweEstimateId === estimate.id" name="i-heroicons-check" class="w-3 h-3 text-white" />
                              </div>
                              <div>
                                <p class="font-medium text-[hsl(var(--foreground))]">{{ estimate.label }}</p>
                                <p v-if="estimate.version" class="text-xs text-[hsl(var(--muted-foreground))]">
                                  Versione {{ estimate.version }}
                                </p>
                              </div>
                            </div>
                            <div>
                              <p class="text-sm font-semibold text-[hsl(var(--foreground))]">
                                {{ estimate.count.toLocaleString('it-IT') }} voci
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>

                    <!-- WBS MAPPING SECTION - Now more prominent -->
                    <div v-if="selectedXpweEstimateId && xpweAvailableKinds.length > 0" class="space-y-4">
                      <div class="bg-[hsl(var(--muted))] rounded-xl p-5">
                        <div class="flex items-center gap-3 mb-4">
                          <div class="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.15)] flex items-center justify-center">
                            <UIcon name="i-heroicons-arrows-right-left" class="w-4 h-4 text-[hsl(var(--primary))]" />
                          </div>
                          <div>
                            <h4 class="text-sm font-semibold text-[hsl(var(--foreground))]">Mappatura Livelli WBS</h4>
                            <p class="text-xs text-[hsl(var(--muted-foreground))]">
                              Associa le categorie del file XPWE alla struttura WBS di Taboolo
                            </p>
                          </div>
                        </div>
                        
                        <div class="space-y-3">
                          <div 
                            v-for="kindItem in xpweAvailableKinds" 
                            :key="kindItem.kind" 
                            class="flex items-center justify-between gap-4 p-3 bg-[hsl(var(--card))] rounded-lg"
                          >
                            <div class="flex-1 min-w-0">
                              <p class="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                                {{ kindItem.kind }}
                              </p>
                              <p class="text-xs text-[hsl(var(--muted-foreground))]">
                                {{ kindItem.count }} {{ kindItem.count === 1 ? 'nodo' : 'nodi' }}
                              </p>
                            </div>
                            <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
                            <div class="w-48 flex-shrink-0">
                              <USelectMenu 
                                v-model="xpweWbsMapping[kindItem.kind]" 
                                :items="canonicalSelectOptions" 
                                value-attribute="value"
                                option-attribute="label"
                                placeholder="Livello WBS..."
                                size="sm"
                                :searchable="false"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                   
                   <!-- No estimates found -->
                   <div v-else-if="xpwePreview && previewXpweEstimates.length === 0" class="text-center py-8">
                      <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-amber-500 mx-auto mb-3" />
                      <p class="text-[hsl(var(--foreground))] font-medium">Nessun preventivo trovato</p>
                      <p class="text-sm text-[hsl(var(--muted-foreground))]">Il file non contiene preventivi validi.</p>
                   </div>

                   <!-- Options -->
                   <div v-if="selectedXpweEstimateId && xpwePreview" class="bg-[hsl(var(--secondary))] rounded-xl p-4 grid grid-cols-[1fr_auto] gap-4 items-center">
                     <div>
                       <p class="text-sm font-medium text-[hsl(var(--foreground))]">Genera Embedding AI</p>
                       <p class="text-xs text-[hsl(var(--muted-foreground))]">Abilita la ricerca semantica (richiede più tempo)</p>
                     </div>
                     <USwitch v-model="enableEmbeddings" color="primary" />
                   </div>

                   <!-- Action Button -->
                   <div v-if="selectedXpweEstimateId" class="flex justify-end pt-2">
                      <UButton 
                        color="primary" 
                        size="lg"
                        icon="i-heroicons-arrow-down-tray" 
                        @click="confirmXpweImport"
                      >
                        Importa Preventivo
                      </UButton>
                   </div>
                 </div>

                 <!-- Status Card -->
                 <ImportStatusCard
                   v-if="xpweStatus !== 'idle'"
                   :status="xpweStatus"
                   :file-name="xpweFile?.name"
                   :progress="xpweProgress"
                   :error-message="xpweError"
                   :result="xpweImportResult || undefined"
                   @reset="resetXpwe"
                 />

              </div>
            </div>
         </template>

         <!-- TAB 3: EXCEL -->
         <template #excel>
            <div class="pt-4 pb-4 h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div class="max-w-4xl mx-auto w-full flex-1 flex flex-col min-h-0 space-y-4">
                 
                 <!-- Intro Section -->
                 <div class="text-center space-y-1">
                   <h2 class="text-lg font-semibold text-[hsl(var(--foreground))]">
                     Importa Offerta da Excel
                   </h2>
                   <p class="text-sm text-[hsl(var(--muted-foreground))]">
                     Carica un file <strong>.xlsx</strong> contenente listino prezzi o offerte.
                   </p>
                 </div>

                 <!-- Wizard Component -->
                 <div class="flex-1 min-h-0">
                   <ImportWizard 
                      :project-id="projectId" 
                      @success="handleExcelSuccess"
                      @close="() => {}"
                   />
                 </div>
              </div>
            </div>
         </template>
        </UTabs>
      </div>
    </template>
  </MainPage>
</template>
