<script setup lang="ts">
import { ref, reactive, computed, provide, type Component } from 'vue'
import { toast } from 'vue-sonner'
import SixUploadStep from './steps/SixUploadStep.vue'
import SixPreviewStep from './steps/SixPreviewStep.vue'
import SixExecuteStep from './steps/SixExecuteStep.vue'

export interface SixImportWizardProps {
  projectId: string | number
}

const props = defineProps<SixImportWizardProps>()

const emit = defineEmits<{
  success: []
  cancel: []
}>()

// Wizard state
const currentStep = ref(1)
const totalSteps = 3

interface StepConfig {
  id: number
  title: string
  description: string
  component: Component
}

export interface SixPreventivo {
  internal_id: string
  code: string
  description: string
  author?: string
  version?: string
  date?: string
  price_list_id?: string
  price_list_label?: string
  detections?: number
  items?: number
  total_amount?: number
}

export interface WizardState {
  // Step 1: Upload
  file: File | null

  // Step 2: Preview
  preventivi: SixPreventivo[]
  selectedPreventivoId: string | null

  // Step 3: Execute
  isExecuting: boolean
  progress: number
  result: unknown | null
  error: string | null

  // Options
  computeEmbeddings: boolean
  extractProperties: boolean
}

const wizardState = reactive<WizardState>({
  // Step 1
  file: null,

  // Step 2
  preventivi: [],
  selectedPreventivoId: null,

  // Step 3
  isExecuting: false,
  progress: 0,
  result: null,
  error: null,

  // Options
  computeEmbeddings: false,
  extractProperties: false,
})

// Provide state to child components
provide('wizardState', wizardState)
const providedProjectId = computed(() => (props.projectId ? String(props.projectId) : ''))
provide('projectId', providedProjectId)

// Step configuration
const steps: StepConfig[] = [
  {
    id: 1,
    title: 'Caricamento',
    description: 'Carica il file STR Vision (.six o .xml)',
    component: SixUploadStep,
  },
  {
    id: 2,
    title: 'Selezione',
    description: 'Seleziona il preventivo da importare',
    component: SixPreviewStep,
  },
  {
    id: 3,
    title: 'Esecuzione',
    description: 'Conferma e avvia import',
    component: SixExecuteStep,
  },
]

const currentStepConfig = computed<StepConfig>(() => steps[currentStep.value - 1] ?? steps[0]!)

// Validation per step
const canProceedFromStep = computed(() => {
  switch (currentStep.value) {
    case 1:
      // Upload: file caricato
      return wizardState.file !== null

    case 2:
      // Preview: preventivo selezionato
      return wizardState.selectedPreventivoId !== null && wizardState.preventivi.length > 0

    case 3:
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
  wizardState.file = null
  wizardState.preventivi = []
  wizardState.selectedPreventivoId = null
  wizardState.isExecuting = false
  wizardState.progress = 0
  wizardState.result = null
  wizardState.error = null
  wizardState.computeEmbeddings = false
  wizardState.extractProperties = false
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
      <h2 class="text-xl font-semibold">Import File SIX (STR Vision)</h2>
      <p class="text-sm text-muted-foreground mt-1">
        Importa preventivi da file STR Vision CPM (.six o .xml)
      </p>
    </div>

    <!-- Progress Steps -->
    <div class="border-b bg-background px-6 py-4">
      <div class="flex items-center justify-between max-w-3xl mx-auto">
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
      <div class="max-w-3xl mx-auto">
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
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between max-w-3xl mx-auto"
      >
        <!-- Pulsante Indietro / placeholder -->
        <div class="flex">
          <UButton
            v-if="!isFirstStep"
            variant="outline"
            :disabled="wizardState.isExecuting"
            @click="handleBack"
          >
            <UIcon name="i-lucide-chevron-left" class="mr-2 h-4 w-4" />
            Indietro
          </UButton>
          <div v-else class="h-10" />
        </div>

        <!-- Pulsanti Annulla + Avanti -->
        <div class="flex gap-3 sm:ml-auto">
          <UButton variant="outline" :disabled="wizardState.isExecuting" @click="handleCancel">
            Annulla
          </UButton>

          <UButton
            v-if="!isLastStep"
            :disabled="!canProceedFromStep || wizardState.isExecuting"
            @click="handleNext"
          >
            Avanti
            <UIcon name="i-lucide-chevron-right" class="ml-2 h-4 w-4" />
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
