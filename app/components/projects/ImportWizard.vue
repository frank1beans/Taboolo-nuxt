<script setup lang="ts">
import { ref, computed, watch, triggerRef } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { AllCommunityModule, ModuleRegistry, type ColDef, type ValueGetterParams, type ICellRendererParams, type ValueSetterParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { useExcelReader } from '~/composables/useExcelReader';
import { api } from '~/lib/api-client';
import GridInputCell from './import-wizard/GridInputCell.vue';
import GridSelectCell from './import-wizard/GridSelectCell.vue';
import GridNumberCell from './import-wizard/GridNumberCell.vue';
import { toast } from 'vue-sonner';
import type { ApiEstimate, ApiProjectDetail } from '~/types/api';

ModuleRegistry.registerModules([AllCommunityModule]);

const props = defineProps<{ projectId: string }>();
const emit = defineEmits<{ success: [result: unknown]; close: [] }>();

// ==================== STATE ====================
const currentStep = ref(1);
const isSubmitting = ref(false);

// Step 1
type ImportMode = 'lx' | 'mx';
type UploadType = 'single' | 'batch' | 'multi';
const selectedMode = ref<ImportMode>('lx');
const uploadType = ref<UploadType>('single');

// Step 2: Files
interface FileEntry {
  id: string;
  fileName: string;
  file: File;
  impresa: string;
  sheet: string;
  sheets: string[];
  headers: { name: string; index: number }[];
  headerRowIndex: number;
  round: number;
}
const files = ref<FileEntry[]>([]);

// Step 3: Column mappings (AG Grid row data)
interface MappingRow {
  id: string;
  campo: string;
  colonna: string;
  note: string;
}
const mappingRows = ref<MappingRow[]>([]);

// Multi-company rows
interface MultiCompanyRow {
  id: string;
  impresa: string;
  prezzo: string;
  quantita: string;
  round: number;
}
const multiCompanyRows = ref<MultiCompanyRow[]>([]);

// constant removed

// Baseline Estimate Selection
const selectedEstimateId = ref<string | undefined>(undefined);
const estimateOptions = ref<{ id: string; label: string }[]>([]);
const submissionState = ref<'idle' | 'loading' | 'success' | 'error'>('idle');
const submissionMessage = ref<string>('');
const submissionDetails = ref<string>('');

onMounted(async () => {
  try {
    const project = await api.getProject(props.projectId) as ApiProjectDetail;
    if (project.estimates) {
      estimateOptions.value = project.estimates
        .filter((e: ApiEstimate) => e.type !== 'offer')
        .map((e: ApiEstimate) => ({
          id: e.id || (e as unknown as { _id?: string })._id || '',
          label: e.description || e.name || 'Senza nome',
        }))
        .filter(opt => !!opt.id);

      if (estimateOptions.value.length === 1) {
        selectedEstimateId.value = estimateOptions.value[0].id;
      }
    }
  } catch (e) {
    console.error("Failed to load project estimates", e);
  }
});

const { readHeadersFromFile, autoDetectColumns } = useExcelReader();

// Theme
const colorMode = useColorMode();
const themeClass = computed(() => (colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'));

// ==================== COMPUTED ====================
const canProceedStep1 = computed(() => {
  // If we require a baseline estimate, we can check it here.
  // Currently, selectedEstimateId is optional but recommended.
  // Actually, for Offers (which this is), we SHOULD ideally select a baseline.
  // But maybe let it be optional to fallback to default logic?
  // User request: "dobbiamo aggiungere... sennò come fa a sapere a quale listino agganciarsi?"
  // So likely mandatory if available.
  if (estimateOptions.value.length > 0 && !selectedEstimateId.value) return false;
  return true;
});

const canProceedStep2 = computed(() => {
  if (files.value.length === 0) return false;
  if (uploadType.value === 'multi') return files.value[0]?.headers?.length > 0;
  return files.value.every((f) => f.headers?.length > 0 && f.impresa.trim().length > 0);
});

const canSubmit = computed(() => {
  const codice = mappingRows.value.find((r) => r.campo === 'Codice')?.colonna;
  const descr = mappingRows.value.find((r) => r.campo === 'Descrizione')?.colonna;
  const prezzo = mappingRows.value.find((r) => r.campo === 'Prezzo')?.colonna;
  const qta = mappingRows.value.find((r) => r.campo === 'Quantita')?.colonna;

  const hasIdentifier = !!codice || !!descr;

  if (uploadType.value === 'multi') {
    return hasIdentifier && multiCompanyRows.value.every((r) => r.impresa.trim() && r.prezzo && r.quantita);
  }

  return hasIdentifier && !!prezzo && !!qta;
});

const headerOptions = computed(() => {
  const h = files.value[0]?.headers || [];
  return ['', ...h.map((x) => x.name)];
});

const modeBadge = computed(() => (selectedMode.value === 'mx' ? 'MX - gerarchico' : 'LX - lista'));
const uploadBadge = computed(() => {
  if (uploadType.value === 'batch') return 'Batch - piu file';
  if (uploadType.value === 'multi') return 'Multi-impresa';
  return 'File singolo';
});
const fileCountBadge = computed(() => (files.value.length ? `${files.value.length} file` : 'Nessun file'));

// ==================== AG GRID COLUMN DEFS ====================
const fileColDefs = computed<ColDef[]>(() => {
  const cols: ColDef[] = [
    { field: 'fileName', headerName: 'File', editable: false, flex: 2, cellClass: 'cell-muted' },
  ];

  if (uploadType.value !== 'multi') {
    cols.push({
      field: 'impresa',
      headerName: 'Impresa *',
      editable: false,
      flex: 1.5,
      cellRenderer: GridInputCell,
      cellClassRules: { 'cell-required': (p) => !p.data.impresa?.trim() },
      cellClass: 'cell-no-padding',
    });
  }

  cols.push(
    {
      field: 'sheet',
      headerName: 'Foglio',
      editable: false,
      flex: 1,
      cellRenderer: GridSelectCell,
      cellRendererParams: (params: ICellRendererParams<FileEntry>) => ({
        values: params.data?.sheets || [],
        onValueChange: (val: string) => params.data && onSheetChanged(params.data.id, val),
      }),
      cellClass: 'cell-no-padding',
    },
    {
      field: 'headers',
      headerName: 'Colonne',
      editable: false,
      width: 100,
      valueGetter: (p: ValueGetterParams<FileEntry, number>) => p.data?.headers?.length || 0,
      cellClass: 'cell-muted text-center',
    },
  );

  if (uploadType.value !== 'multi') {
    cols.push({
      field: 'round',
      headerName: 'Round',
      editable: true,
      width: 90,
      cellEditor: 'agNumberCellEditor',
      valueSetter: (params: ValueSetterParams<FileEntry>) => {
        const parsed = Number(params.newValue);
        params.data.round = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
        return true;
      },
      cellRenderer: GridNumberCell,
    });
  }

  cols.push({
    headerName: '',
    width: 60,
    editable: false,
    cellRenderer: () => '<button class="grid-remove" aria-label="Rimuovi">X</button>',
    onCellClicked: (params: ICellRendererParams<FileEntry>) => params.data && removeFile(params.data.id),
  });

  return cols;
});

const mappingColDefs = computed<ColDef[]>(() => [
  { field: 'campo', headerName: 'Campo', editable: false, width: 140, cellClass: 'cell-muted' },
  {
    field: 'colonna',
    headerName: 'Colonna Excel',
    editable: false,
    flex: 1,
    cellRenderer: GridSelectCell,
    cellRendererParams: { values: () => headerOptions.value },
    cellClassRules: { 'cell-required': (p) => ['Prezzo', 'Quantita'].includes(p.data.campo) && !p.data.colonna },
    cellClass: 'cell-no-padding',
  },
  { field: 'note', headerName: 'Note', editable: false, flex: 1, cellClass: 'cell-muted' },
]);

const multiCompanyColDefs = computed<ColDef[]>(() => [
  {
    field: 'impresa',
    headerName: 'Impresa *',
    editable: false,
    flex: 1.5,
    cellRenderer: GridInputCell,
    cellClassRules: { 'cell-required': (p) => !p.data.impresa?.trim() },
    cellClass: 'cell-no-padding',
  },
  {
    field: 'prezzo',
    headerName: 'Col. Prezzo *',
    editable: false,
    flex: 1,
    cellRenderer: GridSelectCell,
    cellRendererParams: { values: () => headerOptions.value },
    cellClassRules: { 'cell-required': (p) => !p.data.prezzo },
    cellClass: 'cell-no-padding',
  },
  {
    field: 'quantita',
    headerName: 'Col. Quantita *',
    editable: false,
    flex: 1,
    cellRenderer: GridSelectCell,
    cellRendererParams: { values: () => headerOptions.value },
    cellClassRules: { 'cell-required': (p) => !p.data.quantita },
    cellClass: 'cell-no-padding',
  },
  {
    field: 'round',
    headerName: 'Round',
    editable: true,
    width: 90,
    cellEditor: 'agNumberCellEditor',
    valueSetter: (params) => {
      const parsed = Number(params.newValue);
      params.data.round = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
      return true;
    },
  },
  {
    headerName: '',
    width: 60,
    editable: false,
    cellRenderer: () =>
      multiCompanyRows.value.length > 1 ? '<button class="grid-remove" aria-label="Rimuovi">X</button>' : '',
    onCellClicked: (p: ICellRendererParams<MultiCompanyRow>) => p.data && removeMultiRow(p.data.id),
  },
]);

const defaultColDef: ColDef = {
  resizable: true,
  sortable: false,
  editable: false,
};

const fileRowClassRules = computed(() => ({
  'row-missing': (params: ValueGetterParams<FileEntry>) => uploadType.value !== 'multi' && !params.data?.impresa?.trim(),
}));

// ==================== WATCH ====================
watch(
  () => files.value[0]?.headers,
  (newHeaders) => {
    if (!newHeaders || newHeaders.length === 0) return;

    const detected = autoDetectColumns(newHeaders.map((h) => h.name));

    const rows: MappingRow[] = [
      { id: '1', campo: 'Codice', colonna: detected.code[0] || '', note: "Opzionale se c'e Descrizione" },
      { id: '2', campo: 'Descrizione', colonna: detected.description[0] || '', note: "Opzionale se c'e Codice" },
    ];

    if (uploadType.value !== 'multi') {
      rows.push(
        { id: '3', campo: 'Prezzo', colonna: detected.price || '', note: 'Obbligatorio' },
        { id: '4', campo: 'Quantita', colonna: detected.quantity || '', note: 'Obbligatorio' },
      );
    }

    if (selectedMode.value === 'mx') {
      rows.push({ id: '5', campo: 'Progressivo', colonna: '', note: 'Per ordinamento' });
    }

    mappingRows.value = rows;

    if (uploadType.value === 'multi' && multiCompanyRows.value.length === 0) {
      multiCompanyRows.value.push({
        id: crypto.randomUUID(),
        impresa: '',
        prezzo: detected.price || '',
        quantita: detected.quantity || '',
        round: 1,
      });
    }
  },
  { immediate: true },
);

// ==================== HANDLERS ====================
const handleFileSelect = async (selectedFile: File) => {
  if (uploadType.value !== 'batch') files.value = [];

  try {
    const result = await readHeadersFromFile(selectedFile);
    files.value.push({
      id: crypto.randomUUID(),
      fileName: selectedFile.name,
      file: selectedFile,
      impresa: '',
      sheet: result.sheets[0] || '',
      sheets: result.sheets,
      headers: result.headers.map((name: string, index: number) => ({ name, index })),
      headerRowIndex: result.headerRowIndex ?? 0,
      round: 1,
    });
  } catch (err) {
    console.error('Error reading file:', err);
  }
};

const onSheetChanged = async (fileId: string, newSheet: string) => {
  const entry = files.value.find((f) => f.id === fileId);
  if (entry) {
    entry.sheet = newSheet;
    try {
      const result = await readHeadersFromFile(entry.file, newSheet);
      entry.headers = result.headers.map((name: string, index: number) => ({ name, index }));
      entry.headerRowIndex = result.headerRowIndex ?? 0;
    } catch (err) {
      console.error('Error reading sheet headers', err);
    }
  }
};

const removeFile = (id: string) => {
  files.value = files.value.filter((f) => f.id !== id);
};

const addMultiRow = () => {
  multiCompanyRows.value.push({
    id: crypto.randomUUID(),
    impresa: '',
    prezzo: '',
    quantita: '',
    round: 1,
  });
};

const removeMultiRow = (id: string) => {
  if (multiCompanyRows.value.length > 1) {
    multiCompanyRows.value = multiCompanyRows.value.filter((r) => r.id !== id);
  }
};

const goBack = () => {
  if (currentStep.value > 1) currentStep.value--;
};
const goNext = () => {
  if (currentStep.value < 3) currentStep.value++;
};

const submit = async () => {
  if (!canSubmit.value || files.value.length === 0) return;
  isSubmitting.value = true;
  submissionState.value = 'loading';
  submissionMessage.value = 'Import in corso...';
  submissionDetails.value = '';

  try {
    const codice = mappingRows.value.find((r) => r.campo === 'Codice')?.colonna || '';
    const descr = mappingRows.value.find((r) => r.campo === 'Descrizione')?.colonna || '';
    const prog = mappingRows.value.find((r) => r.campo === 'Progressivo')?.colonna || '';

    const priceCol = mappingRows.value.find((r) => r.campo === 'Prezzo')?.colonna || '';
    const qtyCol = mappingRows.value.find((r) => r.campo === 'Quantita')?.colonna || '';

    // Helper per inviare una singola offerta
    const uploadSingle = async (entry: FileEntry, company: string, roundNum: number) => {
      return api.uploadBidOffer(props.projectId, {
        file: entry.file,
        company,
        mode: selectedMode.value,
        sheetName: entry.sheet,
        roundMode: 'auto',
        roundNumber: roundNum,
        codeColumns: codice ? [codice] : [],
        descriptionColumns: descr ? [descr] : [],
        priceColumn: priceCol,
        quantityColumn: qtyCol,
        progressColumn: prog || undefined,
        sourceEstimateId: selectedEstimateId.value,
      });
    };

    if (uploadType.value === 'batch') {
      const successes: Array<{ file: string; company: string }> = [];
      const failures: Array<{ file: string; company: string; error: string }> = [];

      for (const entry of files.value) {
        try {
          const company = entry.impresa;
          const roundNum = entry.round;
          await uploadSingle(entry, company, roundNum);
          successes.push({ file: entry.fileName, company });
        } catch (err) {
          failures.push({
            file: entry.fileName,
            company: entry.impresa,
            error: err instanceof Error ? err.message : 'Errore sconosciuto',
          });
        }
      }

      if (failures.length === 0) {
        submissionState.value = 'success';
        submissionMessage.value = 'Import completato';
        submissionDetails.value = `${successes.length} file importati`;
        toast.success('Import offerta completato', {
          description: submissionDetails.value,
        });
      } else {
        submissionState.value = 'error';
        submissionMessage.value = 'Import parziale';
        submissionDetails.value = `${successes.length} ok, ${failures.length} errori`;
        toast.error('Alcuni file non sono stati importati', { description: submissionDetails.value });
      }

      emit('success', { successes, failures });
    } else {
      const fileEntry = files.value[0];
      if (!fileEntry) return;

      let company: string;
      let roundNum: number;

      if (uploadType.value === 'multi') {
        const row = multiCompanyRows.value[0];
        if (!row) return;
        company = row.impresa;
        roundNum = row.round;
      } else {
        company = fileEntry.impresa;
        roundNum = fileEntry.round;
      }

      const result = await uploadSingle(fileEntry, company, roundNum);

      submissionState.value = 'success';
      submissionMessage.value = 'Import completato';
      submissionDetails.value = result?.name ? `${result.name} - Round ${roundNum}` : `Round ${roundNum}`;
      toast.success('Import offerta completato', {
        description: submissionDetails.value || 'File importato correttamente',
      });
      emit('success', result);
    }
  } catch (err) {
    console.error('Upload failed:', err);
    submissionState.value = 'error';
    const message = err instanceof Error ? err.message : 'Errore durante l\'import.';
    submissionMessage.value = 'Errore durante l\'import';
    submissionDetails.value = message;
    toast.error('Import offerta non riuscito', { description: message });
  } finally {
    isSubmitting.value = false;
  }
};

// Force update helpers for AG Grid reactivity
const forceUpdateFiles = () => triggerRef(files);
const forceUpdateMappings = () => triggerRef(mappingRows);
const forceUpdateMulti = () => triggerRef(multiCompanyRows);
</script>

<template>
    <div class="flex h-full flex-col">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <div class="flex items-center gap-3">
          <template v-for="(label, idx) in ['Configurazione', 'File', 'Mappatura']" :key="idx">
            <div class="flex items-center gap-1.5" :class="{ 'opacity-40': idx + 1 > currentStep }">
            <div
              class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium"
              :class="idx + 1 <= currentStep ? 'bg-primary-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700'"
            >
              {{ idx + 1 }}
            </div>
            <span class="hidden text-xs font-medium sm:block">{{ label }}</span>
          </div>
          <div v-if="idx < 2" class="h-px w-6" :class="idx + 1 < currentStep ? 'bg-primary-500' : 'bg-neutral-300'" />
        </template>
      </div>
      <div class="flex items-center gap-2">
        <UBadge color="primary" variant="soft" size="xs">{{ modeBadge }}</UBadge>
        <UBadge color="neutral" variant="outline" size="xs">{{ uploadBadge }}</UBadge>
        <UBadge v-if="files.length" color="success" variant="soft" size="xs">{{ fileCountBadge }}</UBadge>
        <UButton icon="i-heroicons-x-mark" variant="ghost" size="xs" @click="emit('close')" />
      </div>
    </div>

    <div v-if="submissionState !== 'idle'" class="px-4 pt-3">
      <UAlert
        :title="submissionMessage || 'Stato import'"
        :description="submissionDetails"
        :icon="submissionState === 'loading' ? 'i-heroicons-arrow-path' : submissionState === 'success' ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-triangle'"
        :color="submissionState === 'error' ? 'red' : submissionState === 'success' ? 'green' : 'blue'"
        variant="soft"
      >
        <template v-if="submissionState === 'loading'" #actions>
          <UProgress :value="undefined" color="primary" size="xs" class="w-36" />
        </template>
      </UAlert>
    </div>

    <div class="flex-1 overflow-auto p-5">
      <!-- STEP 1 -->
      <div v-if="currentStep === 1" class="mx-auto max-w-xl space-y-6">
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          Scegli la combinazione piu adatta al file Excel e passa allo step successivo. Puoi modificare i valori nelle celle abilitate (badge richiesto) negli step successivi.
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">Tipo di importazione</h3>
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="m in [
                { id: 'lx', icon: 'i-heroicons-queue-list', title: 'LX - Lista', desc: '1 riga = 1 voce' },
                { id: 'mx', icon: 'i-heroicons-table-cells', title: 'MX - Computo', desc: 'Struttura gerarchica' },
              ]"
              :key="m.id"
              class="flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-all"
              :class="selectedMode === m.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-neutral-200 dark:border-neutral-700'"
              @click="selectedMode = m.id as ImportMode"
            >
              <UIcon :name="m.icon" class="mt-0.5 h-5 w-5 text-primary-500" />
              <div>
                <div class="text-sm font-medium">{{ m.title }}</div>
                <div class="text-xs text-neutral-500">{{ m.desc }}</div>
              </div>
            </button>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">Modalita di caricamento</h3>
          <div class="space-y-2">
            <label
              v-for="t in [
                { id: 'single', title: 'File singolo', desc: '1 file = 1 offerta', icon: 'i-heroicons-document' },
                { id: 'batch', title: 'File multipli', desc: 'Piu file, stessa struttura', icon: 'i-heroicons-document-duplicate' },
                { id: 'multi', title: 'Multi-impresa', desc: '1 file, colonne per impresa', icon: 'i-heroicons-users' },
              ]"
              :key="t.id"
              class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all"
              :class="uploadType === t.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-neutral-200 dark:border-neutral-700'"
            >
              <input v-model="uploadType" :value="t.id" type="radio" class="mt-1" >
              <UIcon :name="t.icon" class="mt-0.5 h-5 w-5 text-neutral-500" />
              <div class="flex-1">
                <div class="text-sm font-medium">{{ t.title }}</div>
                <div class="text-xs text-neutral-500">{{ t.desc }}</div>
              </div>
            </label>
          </div>
        </div>
        
        <!-- BASELINE ESTIMATE SELECTION -->
         <div v-if="estimateOptions.length > 0">
           <h3 class="mb-3 text-sm font-medium">Collegamento Preventivo (Baseline)</h3>
           <UFormField description="Seleziona il preventivo di riferimento per agganciare le voci e il listino prezzi.">
             <USelectMenu
               v-model="selectedEstimateId"
               :items="estimateOptions"
               value-key="id"
               placeholder="Seleziona preventivo..."
               searchable
               color="neutral"
             >
               <template #label>
                 <span v-if="selectedEstimateId" class="truncate">
                    {{ estimateOptions.find(e => e.id === selectedEstimateId)?.label }}
                 </span>
                 <span v-else class="text-gray-500">Seleziona preventivo...</span>
               </template>
               <template #item="{ item }">
                 <div class="flex items-center justify-between w-full">
                    <span>{{ item.label }}</span>
                 </div>
               </template>
             </USelectMenu>
           </UFormField>
         </div>
         <div v-else class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-600">
            Nessun preventivo trovato nel progetto. Impossibile importare un'offerta senza una baseline.
         </div>
      </div>


      <!-- STEP 2 -->
      <div v-else-if="currentStep === 2" class="mx-auto max-w-3xl space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge color="primary" variant="soft" size="xs">{{ modeBadge }}</UBadge>
            <UBadge color="neutral" variant="outline" size="xs">{{ uploadBadge }}</UBadge>
            <UBadge color="success" variant="soft" size="xs">{{ fileCountBadge }}</UBadge>
          </div>
          <span class="text-xs text-neutral-500 dark:text-neutral-400">Click-to-edit nelle colonne abilitate</span>
        </div>

        <UAlert
          color="primary"
          variant="soft"
          title="Carica i file e completa i campi obbligatori"
          description="Impresa, foglio e colonne minime sono editabili direttamente in griglia. Solo le colonne con badge richiesto sono modificabili."
        />

        <FileDropZone
          accept=".xlsx,.xls"
          :multiple="uploadType === 'batch'"
          icon="i-heroicons-document-arrow-up"
          @file-selected="handleFileSelect"
        />

        <ClientOnly v-if="files.length > 0">
          <AgGridVue
            :class="[themeClass, 'w-full rounded border border-neutral-200 dark:border-neutral-700']"
            :style="{ height: Math.max(120, 52 + files.length * 44) + 'px' }"
            :column-defs="fileColDefs"
            :row-data="files"
            :default-col-def="defaultColDef"
            :get-row-id="(params) => params.data?.id"
            :header-height="36"
            :row-height="42"
            :row-class-rules="fileRowClassRules"
            theme="legacy"
            :single-click-edit="true"
            :stop-editing-when-cells-lose-focus="true"
            @cell-value-changed="forceUpdateFiles"
          />
        </ClientOnly>

        <p v-if="files.length > 0 && !canProceedStep2" class="flex items-center gap-1 text-xs text-amber-500">
          <UIcon name="i-heroicons-exclamation-triangle" class="h-4 w-4" />
          Compila impresa e foglio per ogni file per proseguire.
        </p>
      </div>

      <!-- STEP 3 -->
      <div v-else-if="currentStep === 3" class="mx-auto max-w-3xl space-y-4">
        <div class="flex flex-wrap items-center gap-2">
          <UBadge color="primary" variant="soft" size="xs">Mappatura</UBadge>
          <UBadge color="neutral" variant="outline" size="xs">{{ headerOptions.length - 1 }} colonne disponibili</UBadge>
        </div>

        <UAlert
          color="neutral"
          variant="soft"
          title="Abbina le colonne"
          description="Seleziona almeno Codice o Descrizione, e Prezzo + Quantita. Solo le celle editabili mostrano il selettore."
        />

        <ClientOnly>
          <AgGridVue
            :class="[themeClass, 'w-full rounded border border-neutral-200 dark:border-neutral-700']"
            :style="{ height: Math.max(120, 52 + mappingRows.length * 44) + 'px' }"
            :column-defs="mappingColDefs"
            :row-data="mappingRows"
            :default-col-def="defaultColDef"
            :get-row-id="(params) => params.data?.id"
            :header-height="36"
            :row-height="42"
            theme="legacy"
            :single-click-edit="true"
            :stop-editing-when-cells-lose-focus="true"
            @cell-value-changed="forceUpdateMappings"
          />
        </ClientOnly>

        <div v-if="uploadType === 'multi'" class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-medium">Imprese</h3>
              <span class="text-xs text-neutral-500">Ogni riga definisce un round di offerta</span>
            </div>
            <UButton size="xs" variant="soft" icon="i-heroicons-plus" @click="addMultiRow">Aggiungi</UButton>
          </div>
          <ClientOnly>
            <AgGridVue
              :class="[themeClass, 'w-full rounded border border-neutral-200 dark:border-neutral-700']"
              :style="{ height: Math.max(120, 52 + multiCompanyRows.length * 44) + 'px' }"
              :column-defs="multiCompanyColDefs"
              :row-data="multiCompanyRows"
              :default-col-def="defaultColDef"
              :get-row-id="(params) => params.data?.id"
              :header-height="36"
              :row-height="42"
              theme="legacy"
              :single-click-edit="true"
              :stop-editing-when-cells-lose-focus="true"
              @cell-value-changed="forceUpdateMulti"
            />
          </ClientOnly>
        </div>

        <div v-if="!canSubmit" class="flex items-center gap-1 text-xs text-amber-500">
          <UIcon name="i-heroicons-exclamation-triangle" class="h-4 w-4" />
          Seleziona almeno Codice o Descrizione, e Prezzo + Quantita.
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
      <UButton v-if="currentStep > 1" variant="ghost" size="sm" icon="i-heroicons-arrow-left" @click="goBack">
        Indietro
      </UButton>
      <div v-else />

      <UButton v-if="currentStep === 1" :disabled="!canProceedStep1" size="sm" @click="goNext">
        Avanti
        <UIcon name="i-heroicons-arrow-right" class="ml-1" />
      </UButton>
      <UButton v-else-if="currentStep === 2 && canProceedStep2" size="sm" @click="goNext">
        Avanti
        <UIcon name="i-heroicons-arrow-right" class="ml-1" />
      </UButton>
      <UButton
        v-else-if="currentStep === 3"
        :disabled="!canSubmit || isSubmitting"
        :loading="isSubmitting"
        color="primary"
        size="sm"
        @click="submit"
      >
        <UIcon name="i-heroicons-cloud-arrow-up" class="mr-1" />
        Importa
      </UButton>
    </div>
  </div>
</template>

<style scoped>
:deep(.ag-theme-quartz),
:deep(.ag-theme-quartz-dark) {
  --ag-header-height: 36px;
  --ag-row-height: 42px;
  --ag-font-size: 13px;
}

:deep(.cell-muted) {
  color: #6b7280;
}

:deep(.cell-required) {
  background-color: rgba(239, 68, 68, 0.1);
}

:deep(.row-missing .ag-cell) {
  background-color: rgba(234, 179, 8, 0.08);
}

:deep(.grid-remove) {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid #ef4444;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
}

:deep(.cell-no-padding) {
  padding-left: 0 !important;
  padding-right: 0 !important;
}

:deep(.text-center) {
  text-align: center;
}
</style>
