<script setup lang="ts">
import { inject, computed } from 'vue'
import { toast } from 'vue-sonner'
import type { WizardState } from '../UnifiedImportWizard.vue'
import { useExecuteImport, useExecuteBatchImport } from '~/composables/queries/useImportQueries'

const wizardState = inject<WizardState>('wizardState')!
const projectId = inject<number>('projectId')!
const wizardMethods = inject<{
  nextStep: () => void
  prevStep: () => void
  onSuccess: () => void
}>('wizardMethods')!

const { mutate: executeImport, isPending } = useExecuteImport()
const { mutate: executeBatchImport, isPending: isBatchPending } = useExecuteBatchImport()

const isExecuting = computed(() => isPending.value || isBatchPending.value || wizardState.isExecuting)

const configSummary = computed(() => {
  return {
    mode: wizardState.importMode === 'MX' ? 'Computo metrico per appalto' : 'Lista lavorazioni',
    uploadKind:
      wizardState.uploadKind === 'single'
        ? 'Singola Impresa'
        : wizardState.uploadKind === 'multi-empresa'
          ? 'Multi-Impresa'
          : 'Batch',
    roundMode:
      wizardState.roundMode === 'auto'
        ? 'Automatico'
        : wizardState.roundMode === 'new'
          ? 'Nuovo Round'
          : 'Sostituisci Round',
    roundName: wizardState.roundName || 'N/A',
    enterprise: wizardState.enterprise || 'N/A',
    fileName: wizardState.file?.name || 'N/A',
    sheets: wizardState.sheets.length,
    selectedSheet:
      wizardState.sheets.length > 0 ? wizardState.sheets[wizardState.selectedSheetIndex]?.name : 'N/A',
  }
})

const mappedFields = computed(() => {
  return Object.entries(wizardState.mapping)
    .filter(([_, map]) => map.sourceColumn !== null)
    .map(([field, map]) => ({
      field,
      column: map.sourceColumn,
      confidence: map.confidence,
    }))
})

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

const handleExecute = async () => {
  if (!wizardState.file) {
    toast.error('Nessun file selezionato')
    return
  }

  wizardState.isExecuting = true
  wizardState.progress = 0
  wizardState.error = null

  try {
    // Build config from wizard state
    const config = {
      mode: wizardState.importMode,
      round: wizardState.roundName || undefined,
      enterprise: wizardState.enterprise || undefined,
      sheetName: wizardState.sheets[wizardState.selectedSheetIndex]?.name,
      column_mapping: Object.fromEntries(
        Object.entries(wizardState.mapping)
          .filter(([_, map]) => map.sourceColumnIndex !== null)
          .map(([key, map]) => [key, wizardState.headers[map.sourceColumnIndex!]])
      ),
    }

    // Execute import based on upload kind
    if (wizardState.uploadKind === 'single') {
      // Single enterprise import
      executeImport(
        {
          projectId,
          file: wizardState.file,
          config,
        },
        {
          onSuccess: (result) => {
            wizardState.result = result
            wizardState.isExecuting = false
            wizardState.progress = 100
            toast.success('Import completato con successo')

            // Wait a bit to show success, then trigger wizard success
            setTimeout(() => {
              wizardMethods.onSuccess()
            }, 1500)
          },
          onError: (error) => {
            wizardState.error = getErrorMessage(error, 'Errore durante l\'import')
            wizardState.isExecuting = false
            toast.error(wizardState.error)
          },
        }
      )
    } else if (wizardState.uploadKind === 'multi-empresa') {
      // Multi-empresa: create configs for each sheet
      const empresaConfigs = wizardState.sheets.map((sheet) => ({
        enterprise: sheet.name, // Use sheet name as enterprise
        sheet: sheet.name,
        round: wizardState.roundName,
        column_mapping: config.column_mapping,
      }))

      executeBatchImport(
        {
          projectId,
          file: wizardState.file,
          empresaConfigs,
        },
        {
          onSuccess: (result) => {
            wizardState.result = result
            wizardState.isExecuting = false
            wizardState.progress = 100

            setTimeout(() => {
              wizardMethods.onSuccess()
            }, 1500)
          },
          onError: (error) => {
            wizardState.error = getErrorMessage(error, 'Errore durante il batch import')
            wizardState.isExecuting = false
            toast.error(wizardState.error)
          },
        }
      )
    } else {
      // Batch mode - not fully implemented yet
      toast.warning('Modalità batch non ancora completamente implementata')
      wizardState.isExecuting = false
    }
  } catch (error) {
    wizardState.error = getErrorMessage(error, 'Errore durante l\'esecuzione dell\'import')
    wizardState.isExecuting = false
    toast.error(wizardState.error)
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Configuration Summary -->
    <div class="space-y-4">
      <div>
        <UiLabel class="text-base font-semibold">Riepilogo Configurazione</UiLabel>
        <p class="text-sm text-muted-foreground mt-1">
          Verifica le impostazioni prima di avviare l'import
        </p>
      </div>

      <div class="rounded-lg border bg-card divide-y">
        <!-- Import Settings -->
        <div class="p-4 space-y-3">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-muted-foreground">Modalità Import</p>
              <p class="text-sm font-medium mt-1">{{ configSummary.mode }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Tipo Caricamento</p>
              <p class="text-sm font-medium mt-1">{{ configSummary.uploadKind }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Gestione Round</p>
              <p class="text-sm font-medium mt-1">{{ configSummary.roundMode }}</p>
            </div>
            <div v-if="configSummary.roundName !== 'N/A'">
              <p class="text-xs text-muted-foreground">Nome Round</p>
              <p class="text-sm font-medium mt-1">{{ configSummary.roundName }}</p>
            </div>
            <div v-if="configSummary.enterprise !== 'N/A'">
              <p class="text-xs text-muted-foreground">Impresa</p>
              <p class="text-sm font-medium mt-1">{{ configSummary.enterprise }}</p>
            </div>
          </div>
        </div>

        <!-- File Info -->
        <div class="p-4 space-y-3">
          <p class="text-sm font-medium">File</p>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-muted-foreground">Nome File</p>
              <p class="text-sm mt-1">{{ configSummary.fileName }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Fogli Excel</p>
              <p class="text-sm mt-1">{{ configSummary.sheets }}</p>
            </div>
            <div v-if="configSummary.selectedSheet !== 'N/A'">
              <p class="text-xs text-muted-foreground">Foglio Selezionato</p>
              <p class="text-sm mt-1">{{ configSummary.selectedSheet }}</p>
            </div>
          </div>
        </div>

        <!-- Mapping Summary -->
        <div class="p-4 space-y-3">
          <p class="text-sm font-medium">Campi Mappati ({{ mappedFields.length }})</p>
          <div class="flex flex-wrap gap-2">
            <UiBadge v-for="field in mappedFields" :key="field.field" variant="secondary">
              {{ field.field }} → {{ field.column }}
            </UiBadge>
          </div>
        </div>
      </div>
    </div>

    <!-- Execution Status -->
    <div v-if="isExecuting || wizardState.result || wizardState.error" class="space-y-4">
      <!-- Progress -->
      <div v-if="isExecuting" class="rounded-lg border bg-card p-6">
        <div class="flex flex-col items-center gap-4">
          <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
          <div class="text-center">
            <p class="text-sm font-medium">Import in corso...</p>
            <p class="text-xs text-muted-foreground mt-1">
              Attendere il completamento dell'operazione
            </p>
          </div>
          <!-- Progress Bar -->
          <div v-if="wizardState.progress > 0" class="w-full max-w-md">
            <div class="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                class="h-full bg-primary transition-all duration-300"
                :style="{ width: `${wizardState.progress}%` }"
              />
            </div>
            <p class="text-xs text-center text-muted-foreground mt-2">
              {{ Math.round(wizardState.progress) }}%
            </p>
          </div>
        </div>
      </div>

      <!-- Success Result -->
      <div v-if="wizardState.result && !isExecuting" class="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-6">
        <div class="flex items-start gap-4">
          <UIcon name="i-lucide-check-circle-2" class="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
          <div class="flex-1">
            <p class="text-sm font-medium text-green-900 dark:text-green-100">
              Import completato con successo
            </p>
            <p class="text-xs text-green-700 dark:text-green-300 mt-1">
              I dati sono stati importati correttamente nel progetto
            </p>
            <!-- Result details if available -->
            <div v-if="(wizardState.result as any)?.success_count" class="mt-3 space-y-1">
              <p class="text-xs text-green-700 dark:text-green-300">
                • Import riusciti: {{ (wizardState.result as any).success_count }}
              </p>
              <p v-if="(wizardState.result as any)?.failed_count" class="text-xs text-destructive">
                • Import falliti: {{ (wizardState.result as any).failed_count }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="wizardState.error" class="rounded-lg border border-destructive bg-destructive/10 p-6">
        <div class="flex items-start gap-4">
          <UIcon name="i-lucide-x-circle" class="h-6 w-6 text-destructive shrink-0 mt-0.5" />
          <div class="flex-1">
            <p class="text-sm font-medium text-destructive">Errore durante l'import</p>
            <p class="text-xs text-destructive/80 mt-1">{{ wizardState.error }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Execute Button -->
    <div v-if="!isExecuting && !wizardState.result" class="flex justify-center pt-4">
      <UiButton size="lg" :disabled="isExecuting" @click="handleExecute">
        <UIcon v-if="isExecuting" name="i-lucide-loader-2" class="mr-2 h-5 w-5 animate-spin" />
        Avvia Import
      </UiButton>
    </div>

    <!-- Warning -->
    <UiAlert v-if="!isExecuting && !wizardState.result && !wizardState.error">
      <UIcon name="i-lucide-alert-circle" class="h-4 w-4" />
      <p class="text-sm">
        <strong>Attenzione:</strong> L'operazione di import modificherà i dati del progetto.
        Assicurati che tutte le configurazioni siano corrette prima di procedere.
      </p>
    </UiAlert>
  </div>
</template>
