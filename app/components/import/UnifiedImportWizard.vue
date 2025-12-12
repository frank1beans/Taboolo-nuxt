<script setup lang="ts">
import { ref, reactive, computed, provide, type Component } from 'vue'
import { toast } from 'vue-sonner'
import ImportConfigStep from './steps/ImportConfigStep.vue'
import ImportUploadStep from './steps/ImportUploadStep.vue'
import ImportMappingStep from './steps/ImportMappingStep.vue'
import ImportExecuteStep from './steps/ImportExecuteStep.vue'
import type { ColumnMapping, ColumnType } from '@/composables/useColumnMapping'

export interface UnifiedImportWizardProps {
  projectId: number
}

const props = defineProps<UnifiedImportWizardProps>()

const emit = defineEmits<{
  success: []
  cancel: []
}>()

// Wizard state
const currentStep = ref(1)
const totalSteps = 4

interface StepConfig {
  id: number
  title: string
  description: string
  component: Component
}

export type ImportMode = 'MX' | 'LX'
export type UploadKind = 'single' | 'multi-empresa' | 'batch'
export type RoundMode = 'auto' | 'new' | 'replace'

export interface WizardState {
  // Step 1: Configuration
  importMode: ImportMode
  uploadKind: UploadKind
  roundMode: RoundMode
  roundName: string
  enterprise: string

  // Step 2: Upload
  file: File | null
  files: File[]
  selectedSheetIndex: number
  sheets: Array<{ name: string; headers: string[]; data: unknown[][] }>

  // Step 3: Mapping
  headers: string[]
  mapping: Partial<Record<ColumnType, ColumnMapping>>
  previewData: unknown[][]

  // Step 4: Execute
  isExecuting: boolean
  progress: number
  result: unknown | null
  error: string | null
}

const wizardState = reactive<WizardState>({
  // Step 1
  importMode: 'MX',
  uploadKind: 'single',
  roundMode: 'auto',
  roundName: '',
  enterprise: '',

  // Step 2
  file: null,
  files: [],
  selectedSheetIndex: 0,
  sheets: [],

  // Step 3
  headers: [],
  mapping: {},
  previewData: [],

  // Step 4
  isExecuting: false,
  progress: 0,
  result: null,
  error: null,
})

// Provide state to child components
provide('wizardState', wizardState)
provide('projectId', props.projectId)

// Step configuration
const steps: StepConfig[] = [
  {
    id: 1,
    title: 'Configurazione',
    description: 'Seleziona modalità e opzioni di import',
    component: ImportConfigStep,
  },
  {
    id: 2,
    title: 'Caricamento',
    description: 'Carica i file da importare',
    component: ImportUploadStep,
  },
  {
    id: 3,
    title: 'Mappatura',
    description: 'Mappa le colonne del file',
    component: ImportMappingStep,
  },
  {
    id: 4,
    title: 'Esecuzione',
    description: 'Conferma e avvia import',
    component: ImportExecuteStep,
  },
]

const currentStepConfig = computed<StepConfig>(() => steps[currentStep.value - 1] ?? steps[0]!)

// Validation per step
const canProceedFromStep = computed(() => {
  switch (currentStep.value) {
    case 1:
      // Config: roundMode e roundName sono richiesti
      if (wizardState.roundMode === 'new' || wizardState.roundMode === 'replace') {
        return wizardState.roundName.trim() !== ''
      }
      return true

    case 2:
      // Upload: almeno un file caricato
      if (wizardState.uploadKind === 'single' || wizardState.uploadKind === 'multi-empresa') {
        return wizardState.file !== null
      } else if (wizardState.uploadKind === 'batch') {
        return wizardState.files.length > 0
      }
      return false

    case 3: {
      // Mapping: tutti i campi obbligatori mappati
      const requiredFields: ColumnType[] = ['code', 'description', 'price']
      return requiredFields.every((field) => {
        const map = wizardState.mapping[field]
        return map && map.sourceColumnIndex !== null && map.sourceColumnIndex >= 0
      })
    }

    case 4:
      // Execute: sempre true (solo conferma)
      return true

    default:
      return false
  }
})

const isLastStep = computed(() => currentStep.value === totalSteps)
const isFirstStep = computed(() => currentStep.value === 1)

const handleNext = () => {
  if (!canProceedFromStep.value) {
    toast.error('Completa tutti i campi richiesti prima di procedere')
    return
  }

  if (isLastStep.value) {
    // Last step will handle execution
    return
  }

  currentStep.value++
}

const handleBack = () => {
  if (!isFirstStep.value && !wizardState.isExecuting) {
    currentStep.value--
  }
}

const handleCancel = () => {
  if (!wizardState.isExecuting) {
    emit('cancel')
    resetWizard()
  }
}

const handleSuccess = () => {
  emit('success')
  resetWizard()
}

const resetWizard = () => {
  currentStep.value = 1
  wizardState.importMode = 'MX'
  wizardState.uploadKind = 'single'
  wizardState.roundMode = 'auto'
  wizardState.roundName = ''
  wizardState.enterprise = ''
  wizardState.file = null
  wizardState.files = []
  wizardState.selectedSheetIndex = 0
  wizardState.sheets = []
  wizardState.headers = []
  wizardState.mapping = {}
  wizardState.previewData = []
  wizardState.isExecuting = false
  wizardState.progress = 0
  wizardState.result = null
  wizardState.error = null
}

// Expose methods to steps
provide('wizardMethods', {
  nextStep: handleNext,
  prevStep: handleBack,
  onSuccess: handleSuccess,
})
</script>

<template>
  <div class="flex flex-col h-full max-h-[85vh]">
    <!-- Header -->
    <div class="border-b bg-muted/30 px-6 py-4">
      <h2 class="text-xl font-semibold">Import Unificato</h2>
      <p class="text-sm text-muted-foreground mt-1">
        Wizard guidato per l'importazione di ritorni di gara
      </p>
    </div>

    <!-- Progress Steps -->
    <div class="border-b bg-background px-6 py-4">
      <div class="flex items-center justify-between max-w-4xl mx-auto">
        <div
          v-for="(step, index) in steps"
          :key="step.id"
          class="flex items-center"
          :class="{ 'flex-1': index < steps.length - 1 }"
        >
          <!-- Step Circle -->
          <div class="flex flex-col items-center gap-2">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-all"
              :class="{
                'border-primary bg-primary text-primary-foreground': step.id <= currentStep,
                'border-muted bg-background text-muted-foreground': step.id > currentStep,
              }"
            >
              {{ step.id }}
            </div>
            <div class="text-center">
              <p
                class="text-xs font-medium transition-colors"
                :class="{
                  'text-foreground': step.id === currentStep,
                  'text-muted-foreground': step.id !== currentStep,
                }"
              >
                {{ step.title }}
              </p>
            </div>
          </div>

          <!-- Connector Line -->
          <div
            v-if="index < steps.length - 1"
            class="flex-1 h-0.5 mx-4 transition-all"
            :class="{
              'bg-primary': step.id < currentStep,
              'bg-muted': step.id >= currentStep,
            }"
          />
        </div>
      </div>
    </div>

    <!-- Step Content -->
    <div class="flex-1 overflow-y-auto px-6 py-6">
      <div class="max-w-4xl mx-auto">
        <!-- Current Step Header -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold">{{ currentStepConfig.title }}</h3>
          <p class="text-sm text-muted-foreground mt-1">
            {{ currentStepConfig.description }}
          </p>
        </div>

        <!-- Dynamic Step Component -->
        <component
          :is="currentStepConfig.component"
          :key="currentStepConfig.id"
        />
      </div>
    </div>

    <!-- Footer Navigation -->
    <div class="border-t bg-muted/30 px-6 py-4">
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between max-w-4xl mx-auto"
      >
        <!-- Pulsante Indietro / placeholder -->
        <div class="flex">
          <UiButton
            v-if="!isFirstStep"
            variant="outline"
            :disabled="wizardState.isExecuting"
            @click="handleBack"
          >
            <UIcon name="i-lucide-chevron-left" class="mr-2 h-4 w-4" />
            Indietro
          </UiButton>
          <div v-else class="h-10" />
        </div>

        <!-- Pulsanti Annulla + Avanti -->
        <div class="flex gap-3 sm:ml-auto">
          <UiButton variant="outline" :disabled="wizardState.isExecuting" @click="handleCancel">
            Annulla
          </UiButton>

          <UiButton
            v-if="!isLastStep"
            :disabled="!canProceedFromStep || wizardState.isExecuting"
            @click="handleNext"
          >
            Avanti
            <UIcon name="i-lucide-chevron-right" class="ml-2 h-4 w-4" />
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>
