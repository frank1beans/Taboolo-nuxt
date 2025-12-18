<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '~/lib/api-client';
import type { ApiSixEstimatesPreview, ApiEstimate, ApiXpweEstimatesPreview, ApiSixImportReport } from '~/types/api';
import FileDropZone from '~/components/ui/FileDropZone.vue';
import ImportStatusCard from '~/components/ui/ImportStatusCard.vue';
import ImportWizard from '~/components/projects/ImportWizard.vue';

const route = useRoute();
const router = useRouter();
const projectId = route.params.id as string;

definePageMeta({
  breadcrumb: 'Importazione'
});

const activeTab = ref(0);
const items = [{
  label: 'Import Computo (SIX/XML)',
  icon: 'i-heroicons-document-text',
  slot: 'six',
}, {
  label: 'Import Computo (XPWE/PriMus)',
  icon: 'i-heroicons-document-text',
  slot: 'xpwe',
}, {
  label: 'Import Offerta (Excel)',
  icon: 'i-heroicons-table-cells',
  slot: 'excel',
}];

// --- PROCESSO SIX/XML ---
const sixFile = ref<File | null>(null);
const sixStatus = ref<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
const sixError = ref('');
const sixProgress = ref(0);
const sixPreview = ref<ApiSixEstimatesPreview | null>(null);
const selectedEstimateId = ref<string | undefined>(undefined);
const sixImportResult = ref<{ totalItems?: number; wbsNodes?: number; message?: string } | null>(null);
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
};

interface PreviewEstimate {
  id: string;
  label: string;
  count: number;
  version?: string;
  author?: string;
  original: unknown;
}

const previewEstimates = computed<PreviewEstimate[]>(() => {
  if (!sixPreview.value) return [];
  const list = sixPreview.value.preventivi || sixPreview.value.estimates || [];
  return list.map((item: any) => ({
    id: item.preventivoId || item.internal_id,
    label: item.description || item.code || 'Senza nome',
    count: item.stats?.items || item.items || 0,
    version: item.version,
    author: item.author,
    original: item
  }));
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
      enableEmbeddings: false, // Default false for speed
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
      const estimate = (result as any).estimate;
      const estimateItems = Array.isArray(estimate?.items) ? estimate?.items.length : 0;
      totalItems = estimateItems;
      wbsNodes = Array.isArray((result as any).groups) ? (result as any).groups.length : 0;
    } else if (useRawParser.value && isRecord(result) && 'rilevazioni' in result) {
      // Raw Payload (Legacy fallback if needed, but we removed it)
      const detections = (result as any).rilevazioni;
      const values = isRecord(detections) ? Object.values(detections) : [];
      totalItems = values.reduce((acc: number, value) => (Array.isArray(value) ? acc + value.length : acc), 0);
      wbsNodes = Array.isArray((result as any).groups) ? (result as any).groups.length : 0;
    } else {
      // Legacy Report
      totalItems = 0;
      wbsNodes = 0;
    }
    
    sixImportResult.value = {
      totalItems: totalItems,
      wbsNodes: wbsNodes,
      message: 'Computo importato con successo.'
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
  const list = xpwePreview.value.preventivi || xpwePreview.value.estimates || [];
  return list.map((item: any) => ({
    id: item.preventivoId || item.internal_id,
    label: item.description || item.code || 'Senza nome',
    count: item.stats?.items || item.items || 0,
    version: item.version,
    author: item.author,
    original: item
  }));
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
        wbsMapping: xpweWbsMapping.value
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
      const estimate = (result as any).estimate;
      const estimateItems = Array.isArray(estimate?.items) ? estimate?.items.length : 0;
      totalItems = estimateItems;
      wbsNodes = Array.isArray((result as any).groups) ? (result as any).groups.length : 0;
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
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
           <UButton
            icon="i-heroicons-arrow-left"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="navigateToProject"
          >
            Torna al progetto
          </UButton>
        </div>
        <p class="text-xs uppercase tracking-wide font-medium text-[hsl(var(--muted-foreground))]">
          Importazione Dati
        </p>
        <h1 class="text-lg font-semibold text-[hsl(var(--foreground))]">
          Importazione Progetto
        </h1>
      </div>
    </div>

    <!-- Main Content -->
     <UCard class="border-[hsl(var(--border))] bg-[hsl(var(--card))]">
       <UTabs 
        v-model="activeTab" 
        :items="items" 
        class="w-full" 
        :ui="{ list: { background: 'bg-[hsl(var(--secondary))]' } }"
      >
         
         <!-- TAB 1: SIX/XML -->
         <template #six>
            <div class="pt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div class="max-w-xl mx-auto space-y-6">
                 
                 <!-- Raw Mode Switch (REMOVED - Enforced Raw) -->
                 <!-- <div class="flex items-center justify-end">
                   <UToggle v-model="useRawParser" label="Usa Nuovo Parser (Sperimentale)" />
                   <span class="ml-2 text-sm text-gray-500">Usa Nuovo Parser (Sperimentale)</span>
                 </div> -->

                 <!-- Step 1: Upload -->
                 <div v-if="!sixFile || sixStatus === 'processing'">
                    <FileDropZone
                      accept=".six,.xml"
                      icon="i-heroicons-document-duplicate"
                      label="Carica Computo (SIX/XML)"
                      sublabel="Trascina qui il file .six o .xml esportato da STR Vision"
                      :disabled="sixStatus === 'processing'"
                      @file-selected="handleSixFileSelect"
                      @error="(msg) => { sixError = msg; sixStatus = 'error'; }"
                    />
                 </div>

                 <!-- Step 2: Preview & Confirm -->
                 <div v-if="sixFile && sixStatus === 'idle'" class="bg-[hsl(var(--secondary))/50] rounded-lg p-6 border border-[hsl(var(--border))]">
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-sm font-semibold flex items-center gap-2">
                        <UIcon name="i-heroicons-document-check" class="w-5 h-5 text-emerald-500" />
                        {{ sixFile.name }}
                      </h3>
                       <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" size="xs" label="Annulla" @click="resetSix" />
                    </div>

                     <!-- ESTIMATE SELECTION (Dropdown) -->
                     <div v-if="sixPreview && previewEstimates.length > 0" class="space-y-4">
                       <UFormField label="Seleziona Preventivo" description="Scegli quale preventivo importare dal file.">
                         <USelectMenu
                           v-model="selectedEstimateId"
                           :items="previewEstimates"
                           value-key="id"
                           placeholder="Seleziona un preventivo..."
                           searchable
                           searchable-placeholder="Cerca preventivo..."
                           color="neutral"
                           :ui="{
                             trigger: {
                               trailingIcon: null,
                               class: 'w-full justify-between'
                             }
                           }"
                         >
                           <template #item="{ item }">
                              <div class="flex items-center justify-between w-full truncate">
                                <span>{{ item.label }}</span>
                                <div class="flex items-center gap-2">
                                  <UBadge color="neutral" variant="subtle" size="xs">
                                    {{ item.count }} Voci
                                  </UBadge>
                                  <span v-if="item.version" class="text-xs text-[hsl(var(--muted-foreground))]]">v{{ item.version }}</span>
                                </div>
                              </div>
                           </template>
                           <template #default>
                             <UButton
                             color="neutral"
                               class="w-full justify-between"
                               :icon="undefined"
                               variant="solid"
                             >
                               <span v-if="selectedEstimateId" class="truncate">
                                 {{ previewEstimates.find(e => e.id === selectedEstimateId)?.label || 'Selezionato' }}
                               </span>
                               <span v-else class="text-gray-500 truncate">Seleziona...</span>
                             </UButton>
                           </template>
                         </USelectMenu>
                       </UFormField>
                       
                       <div v-if="selectedEstimateId" class="text-sm text-green-600 flex items-center gap-2">
                          <UIcon name="i-heroicons-check-circle" />
                          Preventivo selezionato: {{ previewEstimates.find(e => e.id === selectedEstimateId)?.label }}
                       </div>
                     </div>
                    
                    <!-- RAW MODE MESSAGE -->
                    <div v-else-if="useRawParser" class="space-y-4">
                        <UAlert
                          icon="i-heroicons-beaker"
                          color="primary"
                          variant="soft"
                          title="Modalità Nuova Importazione"
                          description="Verranno importati i dati grezzi (Formule, Dimensioni dettagliate) per l'analisi avanzata con Nitro. La selezione del preventivo è automatica (primo disponibile)."
                        />
                    </div>

                    <div v-else-if="!useRawParser" class="text-center py-4 text-orange-500">
                       Nessun preventivo trovato nel file.
                    </div>

                    <div v-if="selectedEstimateId || (useRawParser && previewEstimates.length > 0)" class="flex justify-end pt-4">
                       <UButton 
                         color="primary" 
                         icon="i-heroicons-arrow-down-tray" 
                         :disabled="!selectedEstimateId"
                         @click="confirmSixImport"
                       >
                         Conferma Importazione
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
                   @reset="resetSix"
                 />

              </div>
            </div>
         </template>

         <!-- TAB XPWE -->
         <template #xpwe>
            <div class="pt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div class="max-w-xl mx-auto space-y-6">

                 <!-- Step 1: Upload -->
                 <div v-if="!xpweFile || xpweStatus === 'processing'">
                    <FileDropZone
                      accept=".xpwe,.xml"
                      icon="i-heroicons-document-duplicate"
                      label="Carica Computo (XPWE/PriMus)"
                      sublabel="Trascina qui il file .xpwe o .xml"
                      :disabled="xpweStatus === 'processing'"
                      @file-selected="handleXpweFileSelect"
                      @error="(msg) => { xpweError = msg; xpweStatus = 'error'; }"
                    />
                 </div>

                 <!-- Step 2: Preview & Confirm -->
                 <div v-if="xpweFile && xpweStatus === 'idle'" class="bg-[hsl(var(--secondary))/50] rounded-lg p-6 border border-[hsl(var(--border))]">
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-sm font-semibold flex items-center gap-2">
                        <UIcon name="i-heroicons-document-check" class="w-5 h-5 text-emerald-500" />
                        {{ xpweFile.name }}
                      </h3>
                       <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" size="xs" label="Annulla" @click="resetXpwe" />
                    </div>

                     <!-- ESTIMATE SELECTION (Dropdown) -->
                     <div v-if="xpwePreview && previewXpweEstimates.length > 0" class="space-y-4">
                       <UFormField label="Seleziona Preventivo" description="Scegli quale preventivo importare dal file.">
                         <USelectMenu
                           v-model="selectedXpweEstimateId"
                           :items="previewXpweEstimates"
                           value-key="id"
                           placeholder="Seleziona un preventivo..."
                           searchable
                           searchable-placeholder="Cerca preventivo..."
                           color="neutral"
                           :ui="{
                             trigger: {
                               trailingIcon: null,
                               class: 'w-full justify-between'
                             }
                           }"
                         >
                           <template #item="{ item }">
                              <div class="flex items-center justify-between w-full truncate">
                                <span>{{ item.label }}</span>
                                <div class="flex items-center gap-2">
                                  <UBadge color="neutral" variant="subtle" size="xs">
                                    {{ item.count }} Voci
                                  </UBadge>
                                  <span v-if="item.version" class="text-xs text-[hsl(var(--muted-foreground))]]">v{{ item.version }}</span>
                                </div>
                              </div>
                           </template>
                           <template #default>
                             <UButton
                             color="neutral"
                               class="w-full justify-between"
                               :icon="undefined"
                               variant="solid"
                             >
                               <span v-if="selectedXpweEstimateId" class="truncate">
                                 {{ previewXpweEstimates.find(e => e.id === selectedXpweEstimateId)?.label || 'Selezionato' }}
                               </span>
                               <span v-else class="text-gray-500 truncate">Seleziona...</span>
                             </UButton>
                           </template>
                         </USelectMenu>
                       </UFormField>

                       <div v-if="selectedXpweEstimateId" class="text-sm text-green-600 flex items-center gap-2">
                          <UIcon name="i-heroicons-check-circle" />
                          Preventivo selezionato: {{ previewXpweEstimates.find(e => e.id === selectedXpweEstimateId)?.label }}
                       </div>

                       <!-- WBS MAPPING SECTION -->
                        <div v-if="xpweAvailableKinds.length > 0" class="pt-4 border-t border-[hsl(var(--border))]">
                          <h4 class="text-sm font-semibold mb-2">Mappatura Livelli WBS</h4>
                          <p class="text-xs text-[hsl(var(--muted-foreground))] mb-4">
                            Associa le categorie rilevate nel file XPWE ai livelli standard di Taboolo.
                          </p>
                          
                          <div class="space-y-3">
                             <div v-for="kindItem in xpweAvailableKinds" :key="kindItem.kind" class="grid grid-cols-2 gap-4 items-center">
                                <div class="text-sm font-medium truncate" :title="kindItem.kind">
                                   {{ kindItem.kind }} 
                                   <span class="text-xs font-normal text-[hsl(var(--muted-foreground))]">({{ kindItem.count }} nodi)</span>
                                </div>
                                <!-- DEBUG -->
                                <div class="text-[10px] text-red-500 hidden">{{ canonicalSelectOptions.length }} opzioni</div>
                                <USelectMenu 
                                  v-model="xpweWbsMapping[kindItem.kind]" 
                                  :items="canonicalSelectOptions" 
                                  value-attribute="value"
                                  option-attribute="label"
                                  placeholder="Seleziona (v3)..."
                                  size="xs"
                                  :searchable="false"
                                />
                             </div>
                          </div>
                        </div>

                     </div>

                    <div v-else-if="xpweUseRawParser" class="space-y-4">
                        <UAlert
                          icon="i-heroicons-beaker"
                          color="primary"
                          variant="soft"
                          title="Modalità Importazione XPWE"
                          description="Verranno importati i dati e strutturati automaticamente."
                        />
                    </div>

                    <div v-else class="text-center py-4 text-orange-500">
                       Nessun preventivo trovato nel file.
                    </div>

                    <div v-if="selectedXpweEstimateId || (xpweUseRawParser && previewXpweEstimates.length > 0)" class="flex justify-end pt-4">
                       <UButton
                         color="primary"
                         icon="i-heroicons-arrow-down-tray"
                         :disabled="!selectedXpweEstimateId"
                         @click="confirmXpweImport"
                       >
                         Conferma Importazione
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

         <!-- TAB 2: EXCEL -->
         <template #excel>
            <div class="pt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div class="h-[600px]">
                 <ImportWizard 
                    :project-id="projectId" 
                    @success="handleExcelSuccess"
                    @close="() => {}"
                 />
               </div>
            </div>
         </template>
       </UTabs>
     </UCard>
  </div>
</template>
