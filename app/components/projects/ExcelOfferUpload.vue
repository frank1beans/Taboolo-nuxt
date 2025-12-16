<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import type { ApiEstimate } from '~/types/api';
import FileDropZone from '~/components/ui/FileDropZone.vue';
import ImportStatusCard from '~/components/ui/ImportStatusCard.vue';
import { api } from '~/lib/api-client';

const props = defineProps<{
  projectId: string;
}>();

const emit = defineEmits<{
  (e: 'success', estimate: ApiEstimate): void;
}>();

// State
const file = ref<File | null>(null);
const status = ref<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
const errorMessage = ref('');
const progress = ref(0);

// Config Form
const config = reactive({
  company: '',
  round: 1,
  sheetName: '', // Optional, default to first
  startRow: 2,
  columns: {
    code: 'A', // Now string
    description: 'B', // Now string
    price: 'E',
    quantity: 'F',
    progressive: '',
  }
});

// Helper to parse column input "A, B" -> ["A", "B"]
const parseColumns = (input: string): string[] => {
  return input.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
};

const handleFileSelect = (selectedFile: File) => {
  file.value = selectedFile;
  status.value = 'idle';
  errorMessage.value = '';
};

const reset = () => {
  file.value = null;
  status.value = 'idle';
  errorMessage.value = '';
  progress.value = 0;
};

const isValid = computed(() => {
  return file.value && 
         config.company.trim().length > 0 && 
         config.columns.code.length > 0 && 
         config.columns.price.trim().length > 0;
});

const upload = async () => {
  if (!file.value || !isValid.value) return;

  status.value = 'uploading';
  progress.value = 10; // Fake progress start

  try {
    // Simulate progress
    const interval = setInterval(() => {
      if (progress.value < 90) progress.value += 10;
    }, 200);

    const result = await api.uploadBidOffer(props.projectId, {
      file: file.value,
      company: config.company,
      sheetName: config.sheetName || 'Sheet1', // Backend often detects first sheet if empty, but let's send default
      roundMode: 'auto', // Or expose selector
      roundNumber: config.round,
      codeColumns: parseColumns(config.columns.code),
      descriptionColumns: parseColumns(config.columns.description),
      priceColumn: config.columns.price,
      quantityColumn: config.columns.quantity || undefined,
      progressColumn: config.columns.progressive || undefined,
    });

    clearInterval(interval);
    progress.value = 100;
    status.value = 'success';
    emit('success', result);
  } catch (err: any) {
    status.value = 'error';
    errorMessage.value = err.message || 'Errore durante il caricamento dell\'offerta.';
    console.error(err);
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- File Selection -->
    <div v-if="!file || status === 'idle'" class="transition-all duration-300">
      <FileDropZone
        accept=".xlsx,.xls"
        label="Carica Offerta Excel"
        sublabel="Trascina qui il file .xlsx o clicca per selezionare"
        icon="i-heroicons-table-cells"
        @file-selected="handleFileSelect"
        @error="(msg) => { errorMessage = msg; status = 'error'; }"
      />
    </div>

    <!-- Configuration Form (Only visible when file is selected and not success) -->
    <div v-if="file && status !== 'success'" class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-4 duration-300">
      
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-primary-500" />
          {{ file.name }}
        </h3>
        <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" size="xs" @click="reset" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- Metadata Section -->
        <div class="space-y-4">
          <h4 class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Dati Offerta</h4>
          
          <UFormGroup label="Nome Impresa *" help="Inserisci il nome dell'impresa offerente">
            <UInput v-model="config.company" placeholder="Es. Edilizia Rossi Srl" icon="i-heroicons-building-office" />
          </UFormGroup>

          <UFormGroup label="Numero Round" help="Identifica la tornata di gara">
             <UInput v-model="config.round" type="number" min="1" placeholder="1" />
          </UFormGroup>

           <UFormGroup label="Nome Foglio (Opzionale)" help="Lascia vuoto per usare il primo foglio">
            <UInput v-model="config.sheetName" placeholder="Es. Computo" icon="i-heroicons-table-cells" />
          </UFormGroup>
        </div>

        <!-- Column Mapping Section -->
        <div class="space-y-4">
          <h4 class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Mapping Colonne Excel (Lettere)</h4>
          
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Colonna Codici *" help="Es. A (o A,B per concatenare)">
              <!-- Use generic text input bound to array via computed or simple v-model handling? Simple for now -->
              <UInput v-model="config.columns.code" placeholder="A" />
            </UFormGroup>

            <UFormGroup label="Colonna Descrizioni *" help="Es. B">
              <UInput v-model="config.columns.description" placeholder="B" />
            </UFormGroup>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Colonna Prezzo Unitario *" help="Es. E">
              <UInput v-model="config.columns.price" placeholder="E" />
            </UFormGroup>

            <UFormGroup label="Colonna Quantità (Opz.)" help="Es. F (se presente)">
              <UInput v-model="config.columns.quantity" placeholder="F" />
            </UFormGroup>
          </div>
          
           <UFormGroup label="Colonna Progressivo (Opz.)" help="Es. A (utile per ordinamento)">
              <UInput v-model="config.columns.progressive" placeholder="" />
            </UFormGroup>
        </div>

      </div>

      <div class="mt-6 flex justify-end">
        <UButton 
          :loading="status === 'uploading'" 
          :disabled="!isValid"
          color="primary" 
          icon="i-heroicons-cloud-arrow-up"
          @click="upload"
        >
          Carica Offerta
        </UButton>
      </div>

       <!-- Status Feedback (Inline valid for error mainly) -->
      <div v-if="status === 'error' && errorMessage" class="mt-4">
          <UAlert title="Errore" icon="i-heroicons-exclamation-triangle" color="error" variant="soft" :description="errorMessage" />
      </div>
    </div>

    <!-- Result Card -->
    <ImportStatusCard
      v-if="status !== 'idle'"
      :status="status"
      :file-name="file?.name"
      :progress="progress"
      :error-message="errorMessage"
      @reset="reset"
    />

  </div>
</template>
