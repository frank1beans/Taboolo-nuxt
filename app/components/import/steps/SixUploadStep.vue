<script setup lang="ts">
import { inject, ref, unref, type MaybeRef } from 'vue'
import { toast } from 'vue-sonner'
import type { WizardState, SixPreventivo } from '../SixImportWizard.vue'

interface SixPreviewResponse {
  estimates: SixPreventivo[]
}

const wizardState = inject<WizardState>('wizardState')!
const projectId = inject<MaybeRef<string | number>>('projectId')!
const wizardMethods = inject<{
  nextStep: () => void
  prevStep: () => void
  onSuccess: () => void
}>('wizardMethods')!

const isLoadingPreview = ref(false)

// Handle file selection
const handleFileSelect = async (file: File | File[]) => {
  const selectedFile = Array.isArray(file) ? file[0] : file

  if (!selectedFile) return

  // Validate file type
  const isValidType =
    selectedFile.name.toLowerCase().endsWith('.six') ||
    selectedFile.name.toLowerCase().endsWith('.xml')

  if (!isValidType) {
    toast.error('Formato file non valido. Sono supportati solo file .six o .xml')
    return
  }

  wizardState.file = selectedFile

  // Auto-advance to preview after file is selected
  await loadPreview()
}

const loadPreview = async () => {
  if (!wizardState.file) {
    toast.error('Nessun file selezionato')
    return
  }

  isLoadingPreview.value = true
  wizardState.error = null

  try {
    const formData = new FormData()
    formData.append('file', wizardState.file)

    const pid = String(unref(projectId) ?? '')
    if (!pid) {
      throw new Error('ID progetto non valido')
    }

    const response = await $fetch(`/api/projects/${pid}/import-six/preview`, {
      method: 'POST',
      body: formData,
    })

    if (response && typeof response === 'object' && 'estimates' in response) {
      wizardState.preventivi = (response as SixPreviewResponse).estimates || []

      if (wizardState.preventivi.length === 0) {
        toast.warning('Nessun preventivo trovato nel file')
      } else {
        toast.success(`${wizardState.preventivi.length} preventivo/i trovato/i`)
        // Auto-advance to next step
        wizardMethods.nextStep()
      }
    } else {
      throw new Error('Formato risposta non valido')
    }
  } catch (error: unknown) {
    let message = 'Errore durante la lettura del file SIX'
    
    if (error && typeof error === 'object') {
      const err = error as Record<string, unknown>
      const errorData = err.data as Record<string, unknown> | undefined
      if (errorData && typeof errorData.message === 'string') {
        message = errorData.message
      } else if (typeof err.message === 'string') {
        message = err.message
      }
    }
    
    wizardState.error = message
    toast.error(wizardState.error)
    console.error('SIX preview error:', error)
  } finally {
    isLoadingPreview.value = false
  }
}

const removeFile = () => {
  wizardState.file = null
  wizardState.preventivi = []
  wizardState.selectedPreventivoId = null
  wizardState.error = null
}
</script>

<template>
  <div class="space-y-6">
    <!-- File Upload Area -->
    <div class="space-y-4">
      <div>
        <UiLabel class="text-base font-semibold">File STR Vision</UiLabel>
        <p class="text-sm text-muted-foreground mt-1">
          Carica un file STR Vision CPM (.six) o esportato XML (.xml)
        </p>
      </div>

      <UploadArea
        v-model="wizardState.file"
        accept=".six,.xml"
        :max-size="50 * 1024 * 1024"
        :disabled="isLoadingPreview"
        @select="handleFileSelect"
        @error="(msg: string) => toast.error(msg)"
      />
    </div>

    <!-- File Info -->
    <div v-if="wizardState.file" class="rounded-lg border bg-card p-4 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">File Selezionato</span>
        <UiBadge>{{ wizardState.file.name }}</UiBadge>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-muted-foreground">Dimensione</span>
        <span>{{ (wizardState.file.size / (1024 * 1024)).toFixed(2) }} MB</span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-muted-foreground">Tipo</span>
        <span>{{ wizardState.file.name.endsWith('.six') ? 'STR Vision (.six)' : 'XML' }}</span>
      </div>

      <!-- Remove button -->
      <div class="pt-2">
        <UiButton
          size="sm"
          variant="outline"
          :disabled="isLoadingPreview"
          @click="removeFile"
        >
          Rimuovi file
        </UiButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoadingPreview" class="rounded-lg border bg-card p-6">
      <div class="flex flex-col items-center gap-4">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <div class="text-center">
          <p class="text-sm font-medium">Analisi file in corso...</p>
          <p class="text-xs text-muted-foreground mt-1">
            Lettura preventivi dal file STR Vision
          </p>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="wizardState.error && !isLoadingPreview" class="rounded-lg border border-destructive bg-destructive/10 p-4">
      <div class="flex items-start gap-3">
        <div class="shrink-0 text-destructive">
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-sm font-medium text-destructive">Errore durante la lettura del file</p>
          <p class="text-xs text-destructive/80 mt-1">{{ wizardState.error }}</p>
        </div>
      </div>
    </div>

    <!-- Instructions -->
    <div class="rounded-lg border bg-muted/30 p-4">
      <p class="text-sm font-medium mb-2">ℹ️ Informazioni</p>
      <ul class="text-xs text-muted-foreground space-y-1 list-disc list-inside">
        <li>I file STR Vision contengono computi metrici e preventivi strutturati</li>
        <li>Puoi caricare file .six (nativi) o .xml (esportati da STR Vision)</li>
        <li>Il sistema rileverà automaticamente i preventivi disponibili nel file</li>
        <li>Nel prossimo step potrai scegliere quale preventivo importare</li>
      </ul>
    </div>
  </div>
</template>
