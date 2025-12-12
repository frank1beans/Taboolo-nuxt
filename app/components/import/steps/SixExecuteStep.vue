<script setup lang="ts">
import { inject, computed, unref, type MaybeRef } from 'vue'
import { toast } from 'vue-sonner'
import type { WizardState } from '../SixImportWizard.vue'
import { useQueryClient } from '@tanstack/vue-query'
import { estimateKeys } from '@/composables/queries/useEstimateQueries'
import { wbsKeys } from '@/composables/queries/useWbsQueries'

const wizardState = inject<WizardState>('wizardState')!
const projectId = inject<MaybeRef<string | number>>('projectId')!
const wizardMethods = inject<{
  nextStep: () => void
  prevStep: () => void
  onSuccess: () => void
}>('wizardMethods')!

const selectedPreventivo = computed(() => {
  if (!wizardState.selectedPreventivoId) return null
  return wizardState.preventivi.find((p) => p.internal_id === wizardState.selectedPreventivoId)
})

const queryClient = useQueryClient()

const formatCurrency = (value?: number) => {
  if (value === null || value === undefined) return 'N/A'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

const handleExecute = async () => {
  if (!wizardState.file || !wizardState.selectedPreventivoId) {
    toast.error('Dati mancanti per eseguire l\'import')
    return
  }

  wizardState.isExecuting = true
  wizardState.progress = 0
  wizardState.error = null

  try {
    const pid = String(unref(projectId) ?? '')
    if (!pid) {
      throw new Error('ID progetto non valido')
    }

    const formData = new FormData()
    formData.append('file', wizardState.file)
    formData.append('estimate_id', wizardState.selectedPreventivoId)

    if (wizardState.computeEmbeddings) {
      formData.append('compute_embeddings', 'true')
    }
    if (wizardState.extractProperties) {
      formData.append('extract_properties', 'true')
    }

    // Simulate progress
    wizardState.progress = 20

    const response = await $fetch(`/api/projects/${pid}/import-six`, {
      method: 'POST',
      body: formData,
    })

    // Invalidate cached data so the new estimate appears in the list
    queryClient.invalidateQueries({ queryKey: estimateKeys.list(pid) })
    queryClient.invalidateQueries({ queryKey: wbsKeys.trees() })
    queryClient.invalidateQueries({ queryKey: wbsKeys.summaries() })

    wizardState.progress = 100
    wizardState.result = response
    toast.success('Import SIX completato con successo')

    // Wait a bit to show success, then trigger wizard success
    setTimeout(() => {
      wizardMethods.onSuccess()
    }, 1500)
  } catch (error: unknown) {
    const message =
      error instanceof Object && 'data' in error && error.data instanceof Object && 'message' in error.data
        ? String(error.data.message)
        : error instanceof Error
          ? error.message
          : 'Errore durante l\'import del file SIX'
    wizardState.error = message
    wizardState.isExecuting = false
    toast.error(message)
    console.error('SIX import error:', error)
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Configuration Summary -->
    <div class="space-y-4">
      <div>
        <UiLabel class="text-base font-semibold">Riepilogo Import</UiLabel>
        <p class="text-sm text-muted-foreground mt-1">
          Verifica i dettagli prima di avviare l'importazione
        </p>
      </div>

      <div class="rounded-lg border bg-card divide-y">
        <!-- File Info -->
        <div class="p-4 space-y-3">
          <p class="text-sm font-medium">File</p>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-muted-foreground">Nome File</p>
              <p class="text-sm mt-1">{{ wizardState.file?.name }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Dimensione</p>
              <p class="text-sm mt-1">
                {{ wizardState.file ? (wizardState.file.size / (1024 * 1024)).toFixed(2) : 0 }} MB
              </p>
            </div>
          </div>
        </div>

        <!-- Preventivo Details -->
        <div v-if="selectedPreventivo" class="p-4 space-y-3">
          <p class="text-sm font-medium">Preventivo Selezionato</p>
          <div class="space-y-3">
            <div>
              <p class="text-xs text-muted-foreground">Codice e Descrizione</p>
              <p class="text-sm mt-1 font-medium">
                {{ selectedPreventivo.description }} ({{ selectedPreventivo.code }})
              </p>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div v-if="selectedPreventivo.author">
                <p class="text-xs text-muted-foreground">Autore</p>
                <p class="text-sm mt-1">{{ selectedPreventivo.author }}</p>
              </div>
              <div v-if="selectedPreventivo.version">
                <p class="text-xs text-muted-foreground">Versione</p>
                <p class="text-sm mt-1">{{ selectedPreventivo.version }}</p>
              </div>
              <div v-if="selectedPreventivo.items !== undefined">
                <p class="text-xs text-muted-foreground">Voci</p>
                <p class="text-sm mt-1">{{ selectedPreventivo.items }}</p>
              </div>
              <div v-if="selectedPreventivo.total_amount !== undefined">
                <p class="text-xs text-muted-foreground">Importo Totale</p>
                <p class="text-sm mt-1 font-medium text-primary">
                  {{ formatCurrency(selectedPreventivo.total_amount) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Options -->
        <div class="p-4 space-y-3">
          <p class="text-sm font-medium">Opzioni</p>
          <div class="flex flex-wrap gap-2">
            <UiBadge v-if="wizardState.computeEmbeddings" variant="secondary">
              Embedding Semantici
            </UiBadge>
            <UiBadge v-if="wizardState.extractProperties" variant="secondary">
              Estrazione Proprietà
            </UiBadge>
            <UiBadge v-if="!wizardState.computeEmbeddings && !wizardState.extractProperties" variant="outline">
              Import Standard
            </UiBadge>
          </div>
        </div>
      </div>
    </div>

    <!-- Execution Status -->
    <div v-if="wizardState.isExecuting || wizardState.result || wizardState.error" class="space-y-4">
      <!-- Progress -->
      <div v-if="wizardState.isExecuting && !wizardState.result" class="rounded-lg border bg-card p-6">
        <div class="flex flex-col items-center gap-4">
          <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
          <div class="text-center">
            <p class="text-sm font-medium">Import in corso...</p>
            <p class="text-xs text-muted-foreground mt-1">
              Importazione del preventivo STR Vision in corso
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
      <div
        v-if="wizardState.result && !wizardState.isExecuting"
        class="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-6"
      >
        <div class="flex items-start gap-4">
          <UIcon name="i-lucide-check-circle-2" class="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
          <div class="flex-1">
            <p class="text-sm font-medium text-green-900 dark:text-green-100">
              Import completato con successo
            </p>
            <p class="text-xs text-green-700 dark:text-green-300 mt-1">
              Il preventivo è stato importato correttamente nel progetto
            </p>
            <!-- Result details if available -->
            <div v-if="(wizardState.result as any)?.items_count" class="mt-3 space-y-1">
              <p class="text-xs text-green-700 dark:text-green-300">
                • Voci importate: {{ (wizardState.result as any).items_count }}
              </p>
              <p v-if="(wizardState.result as any)?.wbs_nodes" class="text-xs text-green-700 dark:text-green-300">
                • Nodi WBS: {{ (wizardState.result as any).wbs_nodes }}
              </p>
              <p v-if="(wizardState.result as any)?.estimate_id" class="text-xs text-green-700 dark:text-green-300">
                • ID Preventivo: {{ (wizardState.result as any).estimate_id }}
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
    <div v-if="!wizardState.isExecuting && !wizardState.result" class="flex justify-center pt-4">
      <UiButton size="lg" :disabled="wizardState.isExecuting" @click="handleExecute">
        <UIcon v-if="wizardState.isExecuting" name="i-lucide-loader-2" class="mr-2 h-5 w-5 animate-spin" />
        Avvia Import
      </UiButton>
    </div>

    <!-- Warning -->
    <UiAlert v-if="!wizardState.isExecuting && !wizardState.result && !wizardState.error">
      <UIcon name="i-lucide-alert-circle" class="h-4 w-4" />
      <p class="text-sm">
        <strong>Attenzione:</strong> L'operazione di import creerà un nuovo computo metrico nel progetto.
        Verifica che tutti i dati siano corretti prima di procedere.
      </p>
    </UiAlert>

    <!-- Additional Info -->
    <div v-if="wizardState.computeEmbeddings || wizardState.extractProperties" class="rounded-lg border bg-muted/30 p-4">
      <p class="text-sm font-medium mb-2">ℹ️ Opzioni Avanzate Attive</p>
      <ul class="text-xs text-muted-foreground space-y-1 list-disc list-inside">
        <li v-if="wizardState.computeEmbeddings">
          Gli embedding semantici verranno calcolati per tutte le voci (tempo di elaborazione: +30-60s)
        </li>
        <li v-if="wizardState.extractProperties">
          Le proprietà automatiche verranno estratte e categorizzate (tempo di elaborazione: +20-40s)
        </li>
      </ul>
    </div>
  </div>
</template>
