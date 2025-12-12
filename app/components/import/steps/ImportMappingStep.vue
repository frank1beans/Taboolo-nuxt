<script setup lang="ts">
import { inject, computed, watch, onMounted } from 'vue'
import type { WizardState } from '../UnifiedImportWizard.vue'
import { useColumnMapping, type ColumnType } from '@/composables/useColumnMapping'

const wizardState = inject<WizardState>('wizardState')!

const headers = computed(() => wizardState.headers)

const {
  mapping,
  autoDetectMapping,
  setMapping,
  isValid,
  validationErrors,
  mappingSummary,
  unmappedColumns,
} = useColumnMapping(headers)

// Auto-detect on mount or when headers change
onMounted(() => {
  if (headers.value.length > 0 && Object.keys(mapping.value).length === 0) {
    performAutoDetection()
  }
})

watch(headers, (newHeaders) => {
  if (newHeaders.length > 0) {
    performAutoDetection()
  }
})

const performAutoDetection = () => {
  const detectedMapping = autoDetectMapping(['code', 'description', 'price', 'quantity'])
  wizardState.mapping = detectedMapping
}

// Field labels
const fieldLabels: Record<string, string> = {
  code: 'Codice Articolo',
  description: 'Descrizione',
  price: 'Prezzo Unitario',
  quantity: 'Quantità',
  unit: 'Unità di Misura',
  amount: 'Importo Totale',
  category: 'Categoria',
  supplier: 'Fornitore',
  notes: 'Note',
}

const requiredFields = ['code', 'description', 'price']

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 80) return 'default'
  if (confidence >= 50) return 'secondary'
  return 'outline'
}

const handleMappingChange = (field: string, columnIndex: number) => {
  setMapping(field as ColumnType, columnIndex >= 0 ? columnIndex : null)
  // Update wizard state
  wizardState.mapping = mapping.value
}

const getColumnOptions = computed(() => {
  const options = [{ value: -1, label: '-- Non mappato --' }]
  headers.value.forEach((header, idx) => {
    options.push({ value: idx, label: header })
  })
  return options
})
</script>

<template>
  <div class="space-y-6">
    <!-- Mapping Summary -->
    <div class="rounded-lg border bg-card p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">Stato Mappatura</p>
          <p class="text-xs text-muted-foreground mt-1">
            {{ mappingSummary.mapped }} su {{ mappingSummary.total }} campi mappati
          </p>
        </div>
        <UiBadge :variant="isValid ? 'default' : 'destructive'">
          {{ isValid ? 'Completo' : 'Incompleto' }}
        </UiBadge>
      </div>

      <!-- Validation Errors -->
      <div v-if="validationErrors.length > 0" class="mt-3 space-y-1">
        <p
          v-for="(error, index) in validationErrors"
          :key="index"
          class="text-xs text-destructive"
        >
          • {{ error }}
        </p>
      </div>
    </div>

    <!-- Mapping Table -->
    <div class="space-y-4">
      <div>
        <UiLabel class="text-base font-semibold">Mappatura Colonne</UiLabel>
        <p class="text-sm text-muted-foreground mt-1">
          Verifica e correggi la mappatura automatica delle colonne del file
        </p>
      </div>

      <div class="rounded-lg border overflow-hidden">
        <table class="w-full">
          <thead class="bg-muted">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-semibold">Campo</th>
              <th class="px-4 py-3 text-left text-sm font-semibold">Colonna Excel</th>
              <th class="px-4 py-3 text-left text-sm font-semibold">Confidenza</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr
              v-for="(map, key) in mapping"
              :key="key"
              class="hover:bg-muted/30 transition-colors"
            >
              <!-- Field Name -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">{{ fieldLabels[key] || key }}</span>
                  <UiBadge v-if="requiredFields.includes(key)" variant="destructive" class="text-xs">
                    Obbligatorio
                  </UiBadge>
                </div>
              </td>

              <!-- Column Selector -->
              <td class="px-4 py-3">
                <UiSelect
                  :model-value="map.sourceColumnIndex ?? -1"
                  :options="getColumnOptions"
                  @update:model-value="(val: any) => handleMappingChange(key, Number(val))"
                />
              </td>

              <!-- Confidence Badge -->
              <td class="px-4 py-3">
                <UiBadge :variant="getConfidenceColor(map.confidence)">
                  {{ map.confidence }}%
                </UiBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Preview Data -->
    <div v-if="wizardState.previewData.length > 0" class="space-y-4">
      <div>
        <UiLabel class="text-base font-semibold">Anteprima Dati</UiLabel>
        <p class="text-sm text-muted-foreground mt-1">
          Prime 5 righe del file con la mappatura applicata
        </p>
      </div>

      <div class="rounded-lg border overflow-auto max-h-80">
        <table class="w-full text-sm">
          <thead class="bg-muted sticky top-0">
            <tr>
              <th
                v-for="(header, idx) in headers"
                :key="idx"
                class="px-3 py-2 text-left text-xs font-medium"
              >
                {{ header }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="(row, rowIdx) in wizardState.previewData" :key="rowIdx">
              <td
                v-for="(cell, cellIdx) in row"
                :key="cellIdx"
                class="px-3 py-2 text-xs"
              >
                {{ cell }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Unmapped Columns Info -->
    <div v-if="unmappedColumns.length > 0" class="rounded-lg border bg-muted/30 p-4">
      <p class="text-sm font-medium mb-2">
        Colonne Non Mappate ({{ unmappedColumns.length }})
      </p>
      <div class="flex flex-wrap gap-2">
        <UiBadge v-for="col in unmappedColumns" :key="col.index" variant="outline">
          {{ col.header }}
        </UiBadge>
      </div>
      <p class="text-xs text-muted-foreground mt-2">
        Queste colonne non verranno importate
      </p>
    </div>
  </div>
</template>
