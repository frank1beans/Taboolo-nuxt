<script setup lang="ts">
import { inject, computed } from 'vue'
import type { WizardState, SixPreventivo } from '../SixImportWizard.vue'

const wizardState = inject<WizardState>('wizardState')!

const selectedPreventivo = computed(() => {
  if (!wizardState.selectedPreventivoId) return null
  return wizardState.preventivi.find((p) => p.internal_id === wizardState.selectedPreventivoId)
})

const selectPreventivo = (preventivo: SixPreventivo) => {
  wizardState.selectedPreventivoId = preventivo.internal_id
}

const formatCurrency = (value?: number) => {
  if (value === null || value === undefined) return 'N/A'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A'
  try {
    return new Date(dateStr).toLocaleDateString('it-IT')
  } catch {
    return dateStr
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Preview Header -->
    <div class="rounded-lg border bg-card p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">File: {{ wizardState.file?.name }}</p>
          <p class="text-xs text-muted-foreground mt-1">
            {{ wizardState.preventivi.length }} preventivo/i trovato/i
          </p>
        </div>
        <UiBadge variant="secondary">
          {{ wizardState.preventivi.length }}
        </UiBadge>
      </div>
    </div>

    <!-- Instructions -->
    <UiAlert>
      <UIcon name="i-lucide-file-text" class="h-4 w-4" />
      <p class="text-sm">
        <strong>Seleziona un preventivo</strong> dalla lista sottostante per importarlo nel progetto.
        Verifica i dettagli prima di procedere.
      </p>
    </UiAlert>

    <!-- Preventivi List -->
    <div class="space-y-4">
      <UiLabel class="text-base font-semibold">
        Preventivi Disponibili
      </UiLabel>

      <div class="space-y-3">
        <div
          v-for="preventivo in wizardState.preventivi"
          :key="preventivo.internal_id"
          class="rounded-lg border transition-all cursor-pointer hover:border-primary/50"
          :class="{
            'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2':
              wizardState.selectedPreventivoId === preventivo.internal_id,
            'hover:bg-muted/30': wizardState.selectedPreventivoId !== preventivo.internal_id,
          }"
          @click="selectPreventivo(preventivo)"
        >
          <div class="p-4">
            <!-- Header -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-base">{{ preventivo.description || 'Preventivo' }}</h3>
                  <UiBadge variant="outline" class="text-xs">
                    {{ preventivo.code }}
                  </UiBadge>
                </div>
                <p v-if="preventivo.author" class="text-sm text-muted-foreground mt-1">
                  Autore: {{ preventivo.author }}
                </p>
              </div>
              <div
                class="shrink-0 w-5 h-5 rounded-full border-2 transition-all"
                :class="{
                  'border-primary bg-primary': wizardState.selectedPreventivoId === preventivo.internal_id,
                  'border-muted': wizardState.selectedPreventivoId !== preventivo.internal_id,
                }"
              >
                <svg
                  v-if="wizardState.selectedPreventivoId === preventivo.internal_id"
                  class="w-full h-full text-primary-foreground"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
            </div>

            <!-- Details Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div v-if="preventivo.version">
                <p class="text-xs text-muted-foreground">Versione</p>
                <p class="font-medium">{{ preventivo.version }}</p>
              </div>
              <div v-if="preventivo.date">
                <p class="text-xs text-muted-foreground">Data</p>
                <p class="font-medium">{{ formatDate(preventivo.date) }}</p>
              </div>
              <div v-if="preventivo.items !== undefined">
                <p class="text-xs text-muted-foreground">Voci</p>
                <p class="font-medium">{{ preventivo.items }}</p>
              </div>
              <div v-if="preventivo.total_amount !== undefined">
                <p class="text-xs text-muted-foreground">Importo Totale</p>
                <p class="font-medium">{{ formatCurrency(preventivo.total_amount) }}</p>
              </div>
            </div>

            <!-- Price List Info -->
            <div
              v-if="preventivo.price_list_label"
              class="mt-3 pt-3 border-t text-sm"
            >
              <p class="text-xs text-muted-foreground mb-1">Listino Prezzi</p>
              <div class="flex items-center gap-2">
                <UiBadge variant="secondary">
                  {{ preventivo.price_list_label }}
                </UiBadge>
                <span v-if="preventivo.price_list_id" class="text-xs text-muted-foreground">
                  (ID: {{ preventivo.price_list_id }})
                </span>
              </div>
            </div>

            <!-- Rilevazioni -->
            <div v-if="preventivo.detections !== undefined" class="mt-3 pt-3 border-t">
              <p class="text-xs text-muted-foreground">
                Rilevazioni: <span class="font-medium">{{ preventivo.detections }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Preview -->
    <div v-if="selectedPreventivo" class="rounded-lg border bg-primary/5 border-primary p-4">
      <p class="text-sm font-medium text-primary mb-2">✓ Preventivo Selezionato</p>
      <p class="text-sm">
        <strong>{{ selectedPreventivo.description }}</strong> ({{ selectedPreventivo.code }})
      </p>
      <p class="text-xs text-muted-foreground mt-1">
        Questo preventivo verrà importato nel progetto al prossimo step
      </p>
    </div>

    <!-- Advanced Options -->
    <div class="space-y-3 pt-4 border-t">
      <UiLabel class="text-base font-semibold">
        Opzioni Avanzate
      </UiLabel>

      <div class="space-y-3">
        <div class="flex items-start gap-3">
          <UiCheckbox
            id="computeEmbeddings"
            v-model="wizardState.computeEmbeddings"
          />
          <div class="flex-1">
            <UiLabel for="computeEmbeddings" class="cursor-pointer">
              Calcola embedding semantici
            </UiLabel>
            <p class="text-xs text-muted-foreground mt-1">
              Abilita la ricerca semantica e suggerimenti intelligenti (richiede più tempo)
            </p>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <UiCheckbox
            id="extractProperties"
            v-model="wizardState.extractProperties"
          />
          <div class="flex-1">
            <UiLabel for="extractProperties" class="cursor-pointer">
              Estrai proprietà automatiche
            </UiLabel>
            <p class="text-xs text-muted-foreground mt-1">
              Analizza e categorizza automaticamente le voci del computo (richiede più tempo)
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="wizardState.preventivi.length === 0" class="rounded-lg border-2 border-dashed p-8 text-center">
      <p class="text-sm text-muted-foreground">
        Nessun preventivo trovato nel file. Torna indietro e carica un file valido.
      </p>
    </div>
  </div>
</template>
