<script setup lang="ts">
import { inject, computed } from 'vue'
import type { WizardState, ImportMode, UploadKind, RoundMode } from '../UnifiedImportWizard.vue'

const wizardState = inject<WizardState>('wizardState')!

const importModeOptions: Array<{ value: ImportMode; label: string; description: string }> = [
  {
    value: 'MX',
    label: 'Computo metrico per appalto (MX)',
    description: 'Import con categorie WBS separate per analisi dettagliata',
  },
  {
    value: 'LX',
    label: 'Lista lavorazioni (LX)',
    description: 'Import lineare cumulativo per preventivi semplificati',
  },
]

const uploadKindOptions: Array<{ value: UploadKind; label: string; description: string }> = [
  {
    value: 'single',
    label: 'Singola Impresa',
    description: 'Un file con i dati di una sola impresa',
  },
  {
    value: 'multi-empresa',
    label: 'Multi-Impresa (file unico)',
    description: 'Un file Excel con fogli diversi per imprese diverse',
  },
  {
    value: 'batch',
    label: 'Batch (file multipli)',
    description: 'Più file Excel, uno per ogni impresa',
  },
]

const roundModeOptions: Array<{ value: RoundMode; label: string; description: string }> = [
  {
    value: 'auto',
    label: 'Automatico',
    description: 'Rileva automaticamente il round dal file',
  },
  {
    value: 'new',
    label: 'Nuovo Round',
    description: 'Crea un nuovo round con il nome specificato',
  },
  {
    value: 'replace',
    label: 'Sostituisci Round',
    description: 'Sostituisce i dati di un round esistente',
  },
]

const showRoundNameInput = computed(() => {
  return wizardState.roundMode === 'new' || wizardState.roundMode === 'replace'
})

const showEnterpriseInput = computed(() => {
  return wizardState.uploadKind === 'single'
})
</script>

<template>
  <div class="space-y-8">
    <!-- Import Mode -->
    <div class="space-y-4">
      <div>
        <UiLabel class="text-base font-semibold">Modalità Import</UiLabel>
        <p class="text-sm text-muted-foreground mt-1">
          Seleziona come organizzare i dati importati
        </p>
      </div>

      <UiRadioGroup v-model="wizardState.importMode" class="space-y-3">
        <div
          v-for="option in importModeOptions"
          :key="option.value"
          class="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-all"
          :class="{
            'border-primary bg-primary/5': wizardState.importMode === option.value,
            'hover:border-primary/50': wizardState.importMode !== option.value,
          }"
          @click="wizardState.importMode = option.value"
        >
          <UiRadioGroupItem :value="option.value" class="mt-0.5" />
          <div class="flex-1">
            <UiLabel class="font-medium cursor-pointer">{{ option.label }}</UiLabel>
            <p class="text-sm text-muted-foreground mt-1">{{ option.description }}</p>
          </div>
        </div>
      </UiRadioGroup>
    </div>

    <!-- Upload Kind -->
    <div class="space-y-4">
      <div>
        <UiLabel class="text-base font-semibold">Tipo Caricamento</UiLabel>
        <p class="text-sm text-muted-foreground mt-1">
          Scegli se caricare dati per una o più imprese
        </p>
      </div>

      <UiRadioGroup v-model="wizardState.uploadKind" class="space-y-3">
        <div
          v-for="option in uploadKindOptions"
          :key="option.value"
          class="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-all"
          :class="{
            'border-primary bg-primary/5': wizardState.uploadKind === option.value,
            'hover:border-primary/50': wizardState.uploadKind !== option.value,
          }"
          @click="wizardState.uploadKind = option.value"
        >
          <UiRadioGroupItem :value="option.value" class="mt-0.5" />
          <div class="flex-1">
            <UiLabel class="font-medium cursor-pointer">{{ option.label }}</UiLabel>
            <p class="text-sm text-muted-foreground mt-1">{{ option.description }}</p>
          </div>
        </div>
      </UiRadioGroup>
    </div>

    <!-- Round Configuration -->
    <div class="space-y-4">
      <div>
        <UiLabel class="text-base font-semibold">Configurazione Round</UiLabel>
        <p class="text-sm text-muted-foreground mt-1">Come gestire i round di offerta</p>
      </div>

      <UiRadioGroup v-model="wizardState.roundMode" class="space-y-3">
        <div
          v-for="option in roundModeOptions"
          :key="option.value"
          class="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-all"
          :class="{
            'border-primary bg-primary/5': wizardState.roundMode === option.value,
            'hover:border-primary/50': wizardState.roundMode !== option.value,
          }"
          @click="wizardState.roundMode = option.value"
        >
          <UiRadioGroupItem :value="option.value" class="mt-0.5" />
          <div class="flex-1">
            <UiLabel class="font-medium cursor-pointer">{{ option.label }}</UiLabel>
            <p class="text-sm text-muted-foreground mt-1">{{ option.description }}</p>
          </div>
        </div>
      </UiRadioGroup>

      <!-- Round Name Input (conditional) -->
      <div v-if="showRoundNameInput" class="space-y-2 pl-7">
        <UiLabel for="roundName">
          Nome Round
          <span class="text-destructive">*</span>
        </UiLabel>
        <UiInput
          id="roundName"
          v-model="wizardState.roundName"
          placeholder="Es: R1, Round 1, Offerta Iniziale..."
          class="max-w-md"
        />
        <p class="text-xs text-muted-foreground">
          Identificativo del round (es: R1, R2, Round Finale)
        </p>
      </div>
    </div>

    <!-- Enterprise Name (conditional) -->
    <div v-if="showEnterpriseInput" class="space-y-4">
      <div>
        <UiLabel class="text-base font-semibold">Impresa</UiLabel>
        <p class="text-sm text-muted-foreground mt-1">
          Nome dell'impresa che ha presentato l'offerta
        </p>
      </div>

      <div class="space-y-2">
        <UiLabel for="enterprise">Nome Impresa</UiLabel>
        <UiInput
          id="enterprise"
          v-model="wizardState.enterprise"
          placeholder="Nome dell'impresa..."
          class="max-w-md"
        />
        <p class="text-xs text-muted-foreground">
          Opzionale - Lascia vuoto se non applicabile
        </p>
      </div>
    </div>
  </div>
</template>
