<script setup lang="ts">
import { inject, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { UIcon } from '#components'
import type { WizardState } from '../UnifiedImportWizard.vue'
import { useExcelParser } from '@/composables/useExcelParser'

const wizardState = inject<WizardState>('wizardState')!

const { parseFile, extractData } = useExcelParser()

const isSingleFile = computed(() => {
  return wizardState.uploadKind === 'single' || wizardState.uploadKind === 'multi-empresa'
})

const isBatchMode = computed(() => {
  return wizardState.uploadKind === 'batch'
})

// Handle single file upload
const handleSingleFileSelect = async (file: File | File[]) => {
  const selectedFile = Array.isArray(file) ? file[0] : file

  if (!selectedFile) return

  wizardState.file = selectedFile

  try {
    // Parse Excel file
    const workbook = await parseFile(selectedFile)

    // Extract data from all sheets
    wizardState.sheets = []
    for (let i = 0; i < workbook.worksheets.length; i++) {
      const sheet = workbook.worksheets[i]
      if (sheet) {
        const { headers, data } = extractData(sheet, { detectHeaders: true })
        wizardState.sheets.push({
          name: sheet.name || `Sheet ${i + 1}`,
          headers,
          data: data.slice(0, 5), // Preview only
        })
      }
    }

    // Auto-select first sheet
    if (wizardState.sheets.length > 0) {
      wizardState.selectedSheetIndex = 0
      updateHeadersFromSheet(0)
    }

    toast.success('File caricato con successo')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore durante la lettura del file Excel'
    toast.error(message)
    console.error('Excel parsing error:', error)
  }
}

// Handle batch files
const handleBatchFileAdd = () => {
  toast.info('Aggiungi file tramite le righe sottostanti')
}

// Update headers when sheet changes
const updateHeadersFromSheet = (sheetIndex: number) => {
  if (wizardState.sheets[sheetIndex]) {
    wizardState.headers = wizardState.sheets[sheetIndex].headers
    wizardState.previewData = wizardState.sheets[sheetIndex].data
  }
}

// Watch sheet selection
watch(
  () => wizardState.selectedSheetIndex,
  (newIndex) => {
    updateHeadersFromSheet(newIndex)
  }
)

const selectedSheetIndexString = computed({
  get: () => wizardState.selectedSheetIndex.toString(),
  set: (val) => {
    wizardState.selectedSheetIndex = Number(val)
  }
})

const sheetOptions = computed(() => {
  return wizardState.sheets.map((sheet, index) => ({
    value: index.toString(),
    label: sheet.name
  }))
})
</script>

<template>
  <div class="space-y-6">
    <!-- Single/Multi-Empresa File Upload -->
    <div v-if="isSingleFile" class="space-y-4">
      <div>
        <UiLabel class="text-base font-semibold">Carica File Excel</UiLabel>
        <p class="text-sm text-muted-foreground mt-1">
          {{
            wizardState.uploadKind === 'single'
              ? 'Carica un file Excel con i dati di una singola impresa'
              : 'Carica un file Excel con fogli multipli (uno per impresa)'
          }}
        </p>
      </div>

      <UploadArea
        v-model="wizardState.file"
        accept=".xlsx,.xls"
        :max-size="50 * 1024 * 1024"
        @select="handleSingleFileSelect"
      />
    </div>

    <!-- Batch Mode Upload -->
    <div v-if="isBatchMode" class="space-y-4">
      <div>
        <UiLabel class="text-base font-semibold">Carica File Multipli</UiLabel>
        <p class="text-sm text-muted-foreground mt-1">
          Carica più file Excel, uno per ogni impresa. Ogni file può avere configurazioni diverse.
        </p>
      </div>

      <UiAlert>
        <p class="text-sm">
          <strong>Modalità Batch:</strong> Aggiungi più file utilizzando il pulsante sottostante.
          Ogni riga rappresenta un file con le sue configurazioni specifiche.
        </p>
      </UiAlert>

      <!-- Batch File List -->
      <div class="space-y-3">
        <!-- TODO: Map over batch files array -->
        <div class="rounded-lg border-2 border-dashed p-6 text-center">
          <p class="text-sm text-muted-foreground mb-3">
            Nessun file caricato. Aggiungi il primo file.
          </p>
          <UiButton size="sm" variant="outline" @click="handleBatchFileAdd">
            <UIcon name="i-lucide-plus" class="mr-2 h-4 w-4" />
            Aggiungi File
          </UiButton>
        </div>

        <!-- Note: BatchUploadRow components would be mapped here in full implementation -->
        <p class="text-xs text-muted-foreground text-center">
          Nota: La modalità batch completa richiede la gestione dinamica delle righe
        </p>
      </div>
    </div>

    <!-- Sheet Selector - SEMPRE VISIBILE quando ci sono fogli -->
    <div v-if="wizardState.sheets.length > 0" class="space-y-2">
      <UiLabel class="text-base font-semibold">Foglio Excel da importare</UiLabel>
      <p class="text-xs text-muted-foreground mb-2">
        Seleziona il foglio da cui estrarre i dati
      </p>
      <UiSelect
        v-model="selectedSheetIndexString"
        :options="sheetOptions"
        placeholder="Seleziona un foglio..."
        class="w-full max-w-md"
      />
    </div>

    <!-- Preview Headers -->
    <div v-if="wizardState.file && wizardState.headers.length > 0" class="space-y-2">
      <UiLabel>Anteprima Intestazioni ({{ wizardState.headers.length }} colonne)</UiLabel>
      <div class="rounded-lg border bg-muted/30 p-3">
        <div class="flex flex-wrap gap-2">
          <UiBadge
            v-for="(header, index) in wizardState.headers.slice(0, 10)"
            :key="index"
            variant="secondary"
          >
            {{ header }}
          </UiBadge>
          <UiBadge v-if="wizardState.headers.length > 10" variant="outline">
            +{{ wizardState.headers.length - 10 }} altre colonne
          </UiBadge>
        </div>
      </div>
    </div>

    <!-- File Info Summary -->
    <div v-if="wizardState.file" class="rounded-lg border bg-card p-4 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">File Selezionato</span>
        <UiBadge>{{ wizardState.file.name }}</UiBadge>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-muted-foreground">Dimensione</span>
        <span>{{
          (wizardState.file.size / (1024 * 1024)).toFixed(2)
        }} MB</span>
      </div>
      <div v-if="wizardState.sheets.length > 0" class="flex items-center justify-between text-sm">
        <span class="text-muted-foreground">Fogli Disponibili</span>
        <span>{{ wizardState.sheets.length }}</span>
      </div>
      <div v-if="wizardState.sheets.length > 0" class="flex items-center justify-between text-sm">
        <span class="text-muted-foreground">Foglio Selezionato</span>
        <span class="font-medium">{{ wizardState.sheets[wizardState.selectedSheetIndex]?.name }}</span>
      </div>
      <div v-if="wizardState.headers.length > 0" class="flex items-center justify-between text-sm">
        <span class="text-muted-foreground">Colonne Rilevate</span>
        <span>{{ wizardState.headers.length }}</span>
      </div>
    </div>
  </div>
</template>
