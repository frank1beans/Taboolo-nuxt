<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '~/lib/api-client';
import type { ApiSixEstimatesPreview, ApiSixEstimateOption, ApiEstimate } from '~/types/api';
import FileDropZone from '~/components/ui/FileDropZone.vue';
import ImportStatusCard from '~/components/ui/ImportStatusCard.vue';
import ExcelOfferUpload from '~/components/projects/ExcelOfferUpload.vue';

const route = useRoute();
const router = useRouter();
const projectId = route.params.id as string;

const { data: project } = await useFetch(`/api/projects/${projectId}/context`);

const activeTab = ref(0);
const items = [{
  label: 'Import Computo (SIX/XML)',
  icon: 'i-heroicons-document-text',
  slot: 'six',
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

interface PreviewEstimate {
  id: string;
  label: string;
  count: number;
  version?: string;
  author?: string;
  original: any;
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
  } catch (err: any) {
    sixStatus.value = 'error';
    sixError.value = err.message || 'Errore durante l\'analisi del file SIX.';
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
    const result = await api.importSixFile(projectId, sixFile.value, selectedEstimateId.value, {
      enableEmbeddings: false, // Default false for speed
      enablePropertyExtraction: false,
      raw: useRawParser.value
    });
    
    clearInterval(interval);
    sixProgress.value = 100;
    
    // Calculate stats based on result type (Raw vs Legacy)
    let totalItems = 0;
    let wbsNodes = 0;

    if (useRawParser.value && 'estimate' in result) {
      // NEW ImportResult Schema
      // result = { project, groups, price_list, estimate }
      const res = result as any;
      totalItems = res.estimate?.items?.length || 0;
      wbsNodes = res.groups?.length || 0;
    } else if (useRawParser.value && 'rilevazioni' in result) {
      // Raw Payload (Legacy fallback if needed, but we removed it)
      const raw = result as any; 
      for (const key in raw.rilevazioni) {
        totalItems += raw.rilevazioni[key].length;
      }
      wbsNodes = (raw.groups || []).length;
    } else {
      // Legacy Report
      totalItems = result.items;
      wbsNodes = result.wbs6 + result.wbs7 + result.spatial_wbs;
    }
    
    sixImportResult.value = {
      totalItems: totalItems,
      wbsNodes: wbsNodes,
      message: 'Computo importato con successo.'
    };
    sixStatus.value = 'success';
  } catch (err: any) {
    clearInterval(interval);
    sixStatus.value = 'error';
    sixError.value = err.message || 'Errore durante l\'importazione finale.';
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
        <p class="text-xs uppercase tracking-wide font-medium text-slate-500 dark:text-slate-400">
          Importazione Dati
        </p>
        <h1 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {{ project?.name || 'Progetto' }}
        </h1>
      </div>
    </div>

    <!-- Main Content -->
     <UCard class="border-white/10 bg-white/5">
       <UTabs :items="items" v-model="activeTab" class="w-full">
         
         <!-- TAB 1: SIX/XML -->
         <template #six="{ item }">
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
                 <div v-if="sixFile && sixStatus === 'idle'" class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-sm font-semibold flex items-center gap-2">
                        <UIcon name="i-heroicons-document-check" class="w-5 h-5 text-green-500" />
                        {{ sixFile.name }}
                      </h3>
                       <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" size="xs" @click="resetSix" label="Annulla" />
                    </div>

                     <!-- ESTIMATE SELECTION (Dropdown) -->
                     <div v-if="sixPreview && previewEstimates.length > 0" class="space-y-4">
                       <UFormGroup label="Seleziona Preventivo" help="Scegli quale preventivo importare dal file.">
                         <USelectMenu
                           v-model="selectedEstimateId"
                           :items="previewEstimates"
                           value-key="id"
                           placeholder="Seleziona un preventivo..."
                           searchable
                           searchable-placeholder="Cerca preventivo..."
                         >
                           <template #item="{ item }">
                              <div class="flex items-center justify-between w-full truncate">
                                <span>{{ item.label }}</span>
                                <div class="flex items-center gap-2">
                                  <UBadge color="neutral" variant="subtle" size="xs">
                                    {{ item.count }} Voci
                                  </UBadge>
                                  <span v-if="item.version" class="text-xs text-gray-400">v{{ item.version }}</span>
                                </div>
                              </div>
                           </template>
                           <template #default="{ open }">
                             <UButton
                               color="neutral"
                               class="w-full justify-between"
                               :icon="selectedEstimateId ? undefined : 'i-heroicons-chevron-up-down'"
                               variant="outline"
                             >
                               <span v-if="selectedEstimateId" class="truncate">
                                 {{ previewEstimates.find(e => e.id === selectedEstimateId)?.label || 'Selezionato' }}
                               </span>
                               <span v-else class="text-gray-500 truncate">Seleziona...</span>

                               <UIcon
                                 name="i-heroicons-chevron-down"
                                 class="w-5 h-5 transition-transform text-gray-400"
                                 :class="[open && 'transform rotate-180']"
                               />
                             </UButton>
                           </template>
                         </USelectMenu>
                       </UFormGroup>
                       
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

                    <div class="flex justify-end pt-4" v-if="selectedEstimateId || (useRawParser && previewEstimates.length > 0)">
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

         <!-- TAB 2: EXCEL -->
         <template #excel="{ item }">
            <div class="pt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div class="max-w-2xl mx-auto">
                 <ExcelOfferUpload 
                    :project-id="projectId" 
                    @success="handleExcelSuccess"
                 />
               </div>
            </div>
         </template>
       </UTabs>
     </UCard>
  </div>
</template>
