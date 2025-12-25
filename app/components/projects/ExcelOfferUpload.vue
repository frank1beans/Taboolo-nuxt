<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import type { ApiOfferImportResult } from '~/types/api';
import FileDropZone from '~/components/ui/FileDropZone.vue';
import ImportStatusCard from '~/components/ui/ImportStatusCard.vue';
import { api } from '~/lib/api-client';
import { useExcelReader } from '~/composables/useExcelReader';

const props = defineProps<{
  projectId: string;
}>();

const emit = defineEmits<{
  (e: 'success', result: ApiOfferImportResult): void;
}>();

const { readHeadersFromFile, autoDetectColumns } = useExcelReader();

// State
const file = ref<File | null>(null);
const status = ref<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
const errorMessage = ref('');
const progress = ref(0);
const uploadResult = ref<{ totalItems?: number; message?: string } | null>(null);

// Excel parsing state
const sheets = ref<string[]>([]);
const headers = ref<string[]>([]);
const selectedSheet = ref('');
const isLoadingSheet = ref(false);

// Config Form
const config = reactive({
  company: '',
  round: 1,
  autoDetect: false,
});

// Selected columns (undefined instead of null for API compatibility)
const selectedCodeColumns = ref<string[]>([]);
const selectedDescriptionColumns = ref<string[]>([]);
const selectedPriceColumn = ref<string | undefined>(undefined);
const selectedQuantityColumn = ref<string | undefined>(undefined);
const selectedProgressiveColumn = ref<string | undefined>(undefined);

// Convert headers to dropdown items
const headerItems = computed(() => 
  headers.value.map(h => ({ label: h, value: h }))
);

// Sheet items for selector
const sheetItems = computed(() => 
  sheets.value.map(s => ({ label: s, value: s }))
);

// Handle file selection
const handleFileSelect = async (selectedFile: File) => {
  file.value = selectedFile;
  status.value = 'processing';
  errorMessage.value = '';

  try {
    const result = await readHeadersFromFile(selectedFile);
    
    console.log('[ExcelOfferUpload] File loaded:', selectedFile.name);
    console.log('[ExcelOfferUpload] Sheets:', result.sheets);
    console.log('[ExcelOfferUpload] Effective sheet:', result.effectiveSheet);
    console.log('[ExcelOfferUpload] Headers:', result.headers);
    console.log('[ExcelOfferUpload] Header row index:', result.headerRowIndex);
    
    sheets.value = result.sheets;
    headers.value = result.headers;
    selectedSheet.value = result.effectiveSheet;
    
    resetColumnSelections();
    status.value = 'idle';
    
    if (result.headers.length === 0) {
      errorMessage.value = 'Nessun header trovato. Verifica che il file contenga dati.';
    }
  } catch (err: unknown) {
    console.error('[ExcelOfferUpload] Error:', err);
    status.value = 'error';
    errorMessage.value = err instanceof Error ? err.message : 'Errore durante la lettura del file Excel.';
  }
};

// Handle sheet change - FIXED: properly reload headers from selected sheet
const handleSheetChange = async (newSheet: string) => {
  if (!file.value || newSheet === selectedSheet.value) return;
  
  isLoadingSheet.value = true;
  
  try {
    const result = await readHeadersFromFile(file.value, newSheet);
    headers.value = result.headers;
    selectedSheet.value = newSheet;
    resetColumnSelections();
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : 'Errore durante la lettura del foglio.';
  } finally {
    isLoadingSheet.value = false;
  }
};

const resetColumnSelections = () => {
  selectedCodeColumns.value = [];
  selectedDescriptionColumns.value = [];
  selectedPriceColumn.value = undefined;
  selectedQuantityColumn.value = undefined;
  selectedProgressiveColumn.value = undefined;
  config.autoDetect = false;
};

// Auto-detect columns when toggle is enabled
watch(() => config.autoDetect, (enabled) => {
  if (enabled && headers.value.length > 0) {
    const detected = autoDetectColumns(headers.value);
    selectedCodeColumns.value = detected.code;
    selectedDescriptionColumns.value = detected.description;
    selectedPriceColumn.value = detected.price ?? undefined;
    selectedQuantityColumn.value = detected.quantity ?? undefined;
    selectedProgressiveColumn.value = detected.progressive ?? undefined;
  }
});

const reset = () => {
  file.value = null;
  status.value = 'idle';
  errorMessage.value = '';
  progress.value = 0;
  uploadResult.value = null;
  sheets.value = [];
  headers.value = [];
  selectedSheet.value = '';
  resetColumnSelections();
};

// LX Mode Validation: requires (code OR description) + price + quantity
const isValid = computed(() => {
  const hasIdentifier = selectedCodeColumns.value.length > 0 || selectedDescriptionColumns.value.length > 0;
  const hasPrice = !!selectedPriceColumn.value;
  const hasQuantity = !!selectedQuantityColumn.value;
  const hasCompany = config.company.trim().length > 0;
  
  return file.value && hasIdentifier && hasPrice && hasQuantity && hasCompany;
});

const upload = async () => {
  if (!file.value || !isValid.value) return;

  status.value = 'uploading';
  progress.value = 10;
  uploadResult.value = null;

  try {
    const interval = setInterval(() => {
      if (progress.value < 90) progress.value += 10;
    }, 200);

    const uploadParams = {
      file: file.value,
      company: config.company,
      mode: 'lx' as const, // LX mode: linear, one row = one item
      sheetName: selectedSheet.value || 'Sheet1',
      roundMode: 'auto' as const,
      roundNumber: config.round,
      codeColumns: selectedCodeColumns.value,
      descriptionColumns: selectedDescriptionColumns.value,
      priceColumn: selectedPriceColumn.value,
      quantityColumn: selectedQuantityColumn.value,
      progressColumn: selectedProgressiveColumn.value,
    };
    
    console.log('[ExcelOfferUpload] Upload params:', {
      ...uploadParams,
      file: uploadParams.file?.name, // Don't log full file
    });

    const result = await api.uploadBidOffer(props.projectId, uploadParams);

    clearInterval(interval);
    progress.value = 100;
    status.value = 'success';
    const warningsCount = result?.warnings?.length ?? 0;
    const alertCount = result?.alerts?.total ?? 0;
    let message = 'Import completato con successo';
    if (warningsCount || alertCount) {
      const parts = [];
      if (warningsCount) parts.push(`${warningsCount} avvisi`);
      if (alertCount) parts.push(`${alertCount} alert`);
      message = `${parts.join(', ')} durante l'import`;
    }
    uploadResult.value = {
      totalItems: result?.summary?.items,
      message,
    };
    emit('success', result);
  } catch (err: unknown) {
    status.value = 'error';
    errorMessage.value = err instanceof Error ? err.message : 'Errore durante il caricamento dell\'offerta.';
    console.error(err);
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- File Selection -->
    <div v-if="!file || status === 'processing'" class="transition-all duration-300">
      <FileDropZone
        accept=".xlsx,.xls"
        label="Carica Offerta Excel"
        sublabel="Trascina qui il file .xlsx o clicca per selezionare"
        icon="i-heroicons-table-cells"
        :disabled="status === 'processing'"
        @file-selected="handleFileSelect"
        @error="(msg) => { errorMessage = msg; status = 'error'; }"
      />
    </div>

    <!-- Configuration Form - IMPROVED LAYOUT -->
    <div 
      v-if="file && status === 'idle'" 
      class="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm overflow-hidden"
    >
      <!-- File Header -->
      <div class="px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))/30] flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <UIcon name="i-heroicons-document-check" class="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 class="font-semibold text-[hsl(var(--foreground))]">{{ file.name }}</h3>
            <p class="text-xs text-[hsl(var(--muted-foreground))]">
              {{ sheets.length }} {{ sheets.length === 1 ? 'foglio' : 'fogli' }} • {{ headers.length }} colonne
            </p>
          </div>
        </div>
        <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" size="sm" @click="reset" />
      </div>

      <div class="p-6 space-y-8">
        
        <!-- SECTION 1: Dati Offerta -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</div>
            <h4 class="font-semibold text-[hsl(var(--foreground))]">Dati Offerta</h4>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UFormField label="Nome Impresa" required class="sm:col-span-2">
              <UInput 
                v-model="config.company" 
                placeholder="Es. Edilizia Rossi Srl" 
                icon="i-heroicons-building-office" 
                size="lg"
              />
            </UFormField>

            <UFormField label="Round">
              <UInput 
                v-model="config.round" 
                type="number" 
                min="1" 
                placeholder="1" 
                size="lg"
              />
            </UFormField>
          </div>
        </div>

        <!-- SECTION 2: Foglio Excel (if multiple) -->
        <div v-if="sheets.length > 1" class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</div>
            <h4 class="font-semibold text-[hsl(var(--foreground))]">Seleziona Foglio</h4>
          </div>
          
          <UFormField label="Foglio Excel" description="Il file contiene più fogli. Seleziona quello da importare.">
            <USelectMenu
              :model-value="selectedSheet"
              :items="sheetItems"
              value-key="value"
              placeholder="Seleziona foglio..."
              size="lg"
              :loading="isLoadingSheet"
              @update:model-value="handleSheetChange"
            >
              <template #leading>
                <UIcon name="i-heroicons-table-cells" class="w-4 h-4" />
              </template>
            </USelectMenu>
          </UFormField>
        </div>

        <!-- SECTION 3: Mappatura Colonne -->
        <div class="space-y-4">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {{ sheets.length > 1 ? '3' : '2' }}
              </div>
              <h4 class="font-semibold text-[hsl(var(--foreground))]">Mappatura Colonne</h4>
            </div>
            <UButton 
              :color="config.autoDetect ? 'primary' : 'neutral'" 
              :variant="config.autoDetect ? 'solid' : 'outline'"
              size="xs"
              icon="i-heroicons-sparkles"
              @click="config.autoDetect = !config.autoDetect"
            >
              Auto-rileva
            </UButton>
          </div>

          <!-- Preview headers -->
          <div class="p-3 rounded-lg bg-[hsl(var(--secondary))/50] border border-[hsl(var(--border))]">
            <p class="text-xs text-[hsl(var(--muted-foreground))] mb-2">Colonne trovate nel foglio "{{ selectedSheet }}":</p>
            <div class="flex flex-wrap gap-1.5">
              <UBadge 
                v-for="h in headers.slice(0, 12)" 
                :key="h" 
                color="neutral" 
                variant="subtle"
                size="xs"
              >
                {{ h }}
              </UBadge>
              <UBadge v-if="headers.length > 12" color="neutral" variant="outline" size="xs">
                +{{ headers.length - 12 }} altre
              </UBadge>
            </div>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Colonne Codice" required description="Puoi selezionare più colonne">
              <USelectMenu
                v-model="selectedCodeColumns"
                :items="headerItems"
                value-key="value"
                multiple
                placeholder="Seleziona colonne..."
                size="lg"
              />
            </UFormField>

            <UFormField label="Colonne Descrizione" description="Puoi selezionare più colonne">
              <USelectMenu
                v-model="selectedDescriptionColumns"
                :items="headerItems"
                value-key="value"
                multiple
                placeholder="Seleziona colonne..."
                size="lg"
              />
            </UFormField>

            <UFormField label="Colonna Prezzo" required>
              <USelectMenu
                v-model="selectedPriceColumn"
                :items="headerItems"
                value-key="value"
                placeholder="Seleziona..."
                size="lg"
              />
            </UFormField>

            <UFormField label="Colonna Quantità">
              <USelectMenu
                v-model="selectedQuantityColumn"
                :items="headerItems"
                value-key="value"
                placeholder="Opzionale"
                size="lg"
              />
            </UFormField>

            <UFormField label="Colonna Progressivo" class="sm:col-span-2">
              <USelectMenu
                v-model="selectedProgressiveColumn"
                :items="headerItems"
                value-key="value"
                placeholder="Opzionale - utile per ordinamento"
                size="lg"
              />
            </UFormField>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary))/30] flex items-center justify-between">
        <div class="text-sm text-[hsl(var(--muted-foreground))]">
          <span v-if="!isValid" class="text-amber-500">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 inline mr-1" />
            Compila i campi obbligatori
          </span>
          <span v-else class="text-emerald-500">
            <UIcon name="i-heroicons-check-circle" class="w-4 h-4 inline mr-1" />
            Pronto per il caricamento
          </span>
        </div>
        <UButton 
          :disabled="!isValid"
          color="primary" 
          size="lg"
          icon="i-heroicons-cloud-arrow-up"
          @click="upload"
        >
          Carica Offerta
        </UButton>
      </div>

      <!-- Error Alert (show if there's an error message even in idle state) -->
      <div v-if="errorMessage" class="p-4 border-t border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30">
        <UAlert 
          title="Attenzione" 
          icon="i-heroicons-exclamation-triangle" 
          color="warning" 
          variant="soft" 
          :description="errorMessage" 
        />
      </div>
    </div>

    <!-- Result Card -->
    <ImportStatusCard
      v-if="status !== 'idle'"
      :status="status"
      :file-name="file?.name"
      :progress="progress"
      :error-message="errorMessage"
      :result="uploadResult || undefined"
      @reset="reset"
    />

  </div>
</template>
