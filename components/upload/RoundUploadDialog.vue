<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useExecuteImport } from '@/composables/queries/useImportQueries'
import type { ColumnType } from '@/composables/useColumnMapping'

export interface RoundUploadDialogProps {
  projectId: number
  open?: boolean
}

const props = withDefaults(defineProps<RoundUploadDialogProps>(), {
  open: false,
})

const emit = defineEmits<{
  close: []
  success: []
}>()

// Steps
const currentStep = ref(1)
const totalSteps = 4

// Step 1: Configuration
const mode = ref<'MX' | 'LX'>('MX')
const round = ref<string>('')
const enterprise = ref<string>('')

// Step 2: File upload
const file = ref<File | null>(null)

// Step 3: Excel parsing and column mapping
const { parseFile, sheets, isLoading: isParsingFile } = useExcelParser()
const selectedSheetIndex = ref(0)
const headers = ref<string[]>([])
const previewData = ref<unknown[][]>([])

const {
  mapping,
  autoDetectMapping,
  setMapping,
  isValid: isMappingValid,
  validationErrors,
} = useColumnMapping(headers)

// Step 4: Execute import
const { mutate: executeImport, isPending: isUploading } = useExecuteImport()

// Computed
const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return mode.value && round.value.trim() !== ''
    case 2:
      return file.value !== null
    case 3:
      return isMappingValid.value
    case 4:
      return true
    default:
      return false
  }
})

const isLastStep = computed(() => currentStep.value === totalSteps)

// Watch file selection to parse Excel
watch(file, async (newFile) => {
  if (!newFile) return

  try {
    const workbook = await parseFile(newFile)

    if (workbook.worksheets.length > 0) {
      selectedSheetIndex.value = 0
      loadSheetData(0)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore durante la lettura del file Excel'
    toast.error(message)
  }
})

// Watch sheet selection
watch(selectedSheetIndex, (newIndex) => {
  if (newIndex >= 0) {
    loadSheetData(newIndex)
  }
})

const selectedSheetIndexString = computed({
  get: () => selectedSheetIndex.value.toString(),
  set: (val) => {
    selectedSheetIndex.value = Number(val)
  }
})

const sheetOptions = computed(() => {
  return sheets.value.map((sheet, index) => ({
    value: index.toString(),
    label: sheet.name
  }))
})

const loadSheetData = (sheetIndex: number) => {
  const sheet = sheets.value[sheetIndex]
  if (!sheet) return

  headers.value = sheet.headers
  previewData.value = sheet.data.slice(0, 5) // Show first 5 rows

  // Auto-detect mapping
  autoDetectMapping(['code', 'description', 'price', 'quantity'])
}

const handleFileSelect = (selectedFile: File | File[]) => {
  if (Array.isArray(selectedFile)) {
    file.value = selectedFile[0]
  } else {
    file.value = selectedFile
  }
}

const handleNext = () => {
  if (!canProceed.value) {
    toast.error('Completa tutti i campi richiesti')
    return
  }

  if (isLastStep.value) {
    handleSubmit()
  } else {
    currentStep.value++
  }
}

const handleBack = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const handleSubmit = () => {
  if (!file.value) {
    toast.error('Nessun file selezionato')
    return
  }

  if (!isMappingValid.value) {
    toast.error('Completa la mappatura delle colonne')
    return
  }

  // Build config from mapping
  const config = {
    mode: mode.value,
    round: round.value,
    enterprise: enterprise.value || undefined,
    sheetName: sheets.value[selectedSheetIndex.value]?.name || 'Sheet1',
    column_mapping: Object.fromEntries(
      Object.entries(mapping.value).map(([key, val]) => [
        key,
        val.sourceColumnIndex !== null ? headers.value[val.sourceColumnIndex] : null,
      ])
    ),
  }

  executeImport(
    {
      projectId: props.projectId,
      file: file.value,
      config,
    },
    {
      onSuccess: () => {
        emit('success')
        handleClose()
      },
    }
  )
}

const updateMapping = (field: ColumnType, value: number | null) => {
  setMapping(field, value)
}

const toColumnIndex = (value: string | number | null): number | null => {
  if (value === null || value === '' || value === '-1') {
    return null
  }
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isNaN(numeric) ? null : numeric
}

const handleClose = () => {
  // Reset wizard
  currentStep.value = 1
  mode.value = 'MX'
  round.value = ''
  enterprise.value = ''
  file.value = null
  selectedSheetIndex.value = 0
  headers.value = []
  previewData.value = []
  emit('close')
}

const getModeLabel = (m: 'MX' | 'LX') => {
  return m === 'MX' ? 'Computo metrico per appalto' : 'Lista lavorazioni'
}

const columnOptions = computed(() => {
  const options = [{ value: '-1', label: '-- Non mappato --' }]
  headers.value.forEach((header, idx) => {
    options.push({ value: String(idx), label: header })
  })
  return options
})
</script>

<template>
  <Dialog :open="open" @update:open="(val) => !val && handleClose()">
    <DialogContent class="max-w-4xl max-h-[90vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Carica Round Offerta</DialogTitle>
        <DialogDescription>
          Carica un file Excel con le offerte di un round di gara
        </DialogDescription>
      </DialogHeader>

      <!-- Progress indicator -->
      <div class="flex items-center gap-2 py-2">
        <div
          v-for="step in totalSteps"
          :key="step"
          class="flex-1 h-1 rounded-full transition-all"
          :class="step <= currentStep ? 'bg-primary' : 'bg-muted'"
        />
      </div>

      <!-- Step content -->
      <div class="flex-1 overflow-y-auto py-4 space-y-6">
        <!-- Step 1: Configuration -->
        <div v-if="currentStep === 1" class="space-y-6">
          <div>
            <h3 class="text-sm font-semibold mb-3">Configurazione Import</h3>
            <p class="text-xs text-muted-foreground mb-4">
              Seleziona la modalità di import e specifica i dettagli del round
            </p>
          </div>

          <!-- Mode selection -->
          <div class="space-y-2">
            <Label>Modalità Import *</Label>
            <Select
              v-model="mode"
              :options="[
                { value: 'MX', label: 'Computo metrico per appalto (MX)' },
                { value: 'LX', label: 'Lista lavorazioni (LX)' }
              ]"
            />
            <p class="text-xs text-muted-foreground">
              MX: Import con categorie separate. LX: Import lineare cumulativo
            </p>
          </div>

          <!-- Round -->
          <div class="space-y-2">
            <Label for="round">Nome Round *</Label>
            <Input
              id="round"
              v-model="round"
              type="text"
              placeholder="Es: R1, Round 1, Offerta Iniziale..."
            />
            <p class="text-xs text-muted-foreground">
              Identificativo del round di offerta (sarà creato se non esiste)
            </p>
          </div>

          <!-- Enterprise -->
          <div class="space-y-2">
            <Label for="enterprise">Impresa</Label>
            <Input
              id="enterprise"
              v-model="enterprise"
              type="text"
              placeholder="Nome dell'impresa..."
            />
            <p class="text-xs text-muted-foreground">
              Opzionale - Nome dell'impresa che ha presentato l'offerta
            </p>
          </div>
        </div>

        <!-- Step 2: File Upload -->
        <div v-if="currentStep === 2" class="space-y-6">
          <div>
            <h3 class="text-sm font-semibold mb-3">Caricamento File</h3>
            <p class="text-xs text-muted-foreground mb-4">
              Carica il file Excel contenente le offerte
            </p>
          </div>

          <UploadArea
            v-model="file"
            accept=".xlsx,.xls"
            :max-size="20 * 1024 * 1024"
            @select="handleFileSelect"
          />

          <div v-if="isParsingFile" class="flex items-center justify-center py-8">
            <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
            <span class="ml-2 text-sm text-muted-foreground">Analisi del file in corso...</span>
          </div>

          <!-- Sheet selector -->
          <div v-if="sheets.length > 0" class="space-y-2">
            <Label>Foglio Excel da importare</Label>
            <p class="text-xs text-muted-foreground mb-2">
              Seleziona il foglio da cui estrarre i dati
            </p>
            <Select 
              v-model="selectedSheetIndexString"
              :options="sheetOptions"
              placeholder="Seleziona un foglio..."
            />
          </div>

          <!-- Preview Headers -->
          <div v-if="file && headers.length > 0" class="space-y-2">
            <Label>Anteprima Intestazioni</Label>
            <div class="rounded-lg border bg-muted/30 p-3">
              <div class="flex flex-wrap gap-2">
                <Badge
                  v-for="(header, index) in headers.slice(0, 10)"
                  :key="index"
                  variant="secondary"
                >
                  {{ header }}
                </Badge>
                <Badge v-if="headers.length > 10" variant="outline">
                  +{{ headers.length - 10 }} altre colonne
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Column Mapping -->
        <div v-if="currentStep === 3" class="space-y-6">
          <div>
            <h3 class="text-sm font-semibold mb-3">Mappatura Colonne</h3>
            <p class="text-xs text-muted-foreground mb-4">
              Verifica e correggi la mappatura automatica delle colonne
            </p>
          </div>

          <!-- Mapping table -->
          <div class="border rounded-lg overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-muted">
                <tr>
                  <th class="px-3 py-2 text-left font-medium">Campo</th>
                  <th class="px-3 py-2 text-left font-medium">Colonna Excel</th>
                  <th class="px-3 py-2 text-left font-medium">Confidenza</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr v-for="(map, key) in mapping" :key="key">
                  <td class="px-3 py-2">
                    <span class="font-medium">{{ key }}</span>
                    <span v-if="map.required" class="text-destructive ml-1">*</span>
                  </td>
                  <td class="px-3 py-2">
                    <Select
                      :model-value="map.sourceColumnIndex !== null ? String(map.sourceColumnIndex) : '-1'"
                      :options="columnOptions"
                      @update:model-value="(val) => updateMapping(key as ColumnType, toColumnIndex(val))"
                    />
                  </td>
                  <td class="px-3 py-2">
                    <Badge
                      :variant="
                        map.confidence >= 80
                          ? 'default'
                          : map.confidence >= 50
                            ? 'secondary'
                            : 'outline'
                      "
                    >
                      {{ map.confidence }}%
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Validation errors -->
          <div v-if="validationErrors.length > 0" class="space-y-1">
            <p
              v-for="(error, idx) in validationErrors"
              :key="idx"
              class="text-xs text-destructive"
            >
              • {{ error }}
            </p>
          </div>

          <!-- Preview -->
          <div v-if="previewData.length > 0" class="space-y-2">
            <Label>Anteprima Dati (prime 5 righe)</Label>
            <div class="border rounded-lg overflow-auto max-h-60">
              <table class="w-full text-xs">
                <thead class="bg-muted sticky top-0">
                  <tr>
                    <th
                      v-for="(header, idx) in headers"
                      :key="idx"
                      class="px-2 py-1 text-left font-medium"
                    >
                      {{ header }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr v-for="(row, rowIdx) in previewData" :key="rowIdx">
                    <td v-for="(cell, cellIdx) in row" :key="cellIdx" class="px-2 py-1">
                      {{ cell }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Step 4: Confirmation -->
        <div v-if="currentStep === 4" class="space-y-6">
          <div>
            <h3 class="text-sm font-semibold mb-3">Conferma e Avvia Import</h3>
            <p class="text-xs text-muted-foreground mb-4">Verifica i dati e avvia l'import</p>
          </div>

          <div class="space-y-4 border rounded-lg p-4 bg-muted/30">
            <div>
              <p class="text-xs text-muted-foreground">Modalità</p>
              <p class="text-sm font-medium">{{ getModeLabel(mode) }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Round</p>
              <p class="text-sm font-medium">{{ round }}</p>
            </div>
            <div v-if="enterprise">
              <p class="text-xs text-muted-foreground">Impresa</p>
              <p class="text-sm font-medium">{{ enterprise }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">File</p>
              <p class="text-sm font-medium">{{ file?.name }}</p>
            </div>
            <div v-if="sheets.length > 0">
              <p class="text-xs text-muted-foreground">Foglio</p>
              <p class="text-sm font-medium">{{ sheets[selectedSheetIndex]?.name }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer with navigation -->
      <DialogFooter class="flex items-center justify-between">
        <div class="flex gap-2">
          <Button v-if="currentStep > 1" variant="outline" :disabled="isUploading" @click="handleBack">
            <UIcon name="i-lucide-chevron-left" class="mr-1 h-4 w-4" />
            Indietro
          </Button>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" :disabled="isUploading" @click="handleClose">Annulla</Button>
          <Button :disabled="!canProceed || isUploading" @click="handleNext">
            <UIcon v-if="isUploading" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
            <span v-if="isLastStep">Avvia Import</span>
            <span v-else>
              Avanti
              <UIcon name="i-lucide-chevron-right" class="ml-1 h-4 w-4" />
            </span>
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
