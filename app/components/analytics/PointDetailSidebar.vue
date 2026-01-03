<script setup lang="ts">
import type { GlobalPoint } from '~/composables/useGlobalAnalytics'
import type { PropertyPoint } from '~/composables/useGlobalPropertyAnalytics'
import { formatCurrency } from '~/lib/formatters'

type Point = GlobalPoint | PropertyPoint

const props = defineProps<{
  point: Point | null
  mode: 'global' | 'properties'
}>()

const emit = defineEmits<{
  close: []
}>()

const { copyToClipboard } = useCopyToClipboard()

// Use toValue to handle potential refs passed as props
const resolvedPoint = computed(() => toValue(props.point))
const copyPointCode = (text: string) => {
  copyToClipboard(text, { title: 'Copiato', description: text, color: 'success' })
}

// Detect properties
const hasProperties = computed(() => {
  if (!resolvedPoint.value) return false
  return 'extracted_properties' in resolvedPoint.value && resolvedPoint.value.extracted_properties
})

const propertyEntries = computed(() => {
  if (!resolvedPoint.value || !hasProperties.value) return []
  const p = resolvedPoint.value as PropertyPoint
  return Object.entries(p.extracted_properties || {})
    .map(([key, slot]) => ({ key, value: slot?.value ?? slot }))
    .sort((a, b) => a.key.localeCompare(b.key))
})

function formatPropertyValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const longDescription = computed(() => {
  if (!resolvedPoint.value) return ''
  const p = resolvedPoint.value as {
    long_description?: string | null
    extended_description?: string | null
    longDescription?: string | null
  }
  const desc = p.long_description || p.extended_description || p.longDescription || ''
  return desc !== resolvedPoint.value?.label ? desc : ''
})
</script>

<template>
  <SidebarModule title="Dettagli" icon="heroicons:document-text">
    <template #header-actions>
      <UButton
        icon="i-heroicons-x-mark"
        size="xs"
        variant="ghost"
        color="neutral"
        title="Chiudi dettagli"
        class="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        @click="emit('close')"
      />
    </template>

    <!-- Content -->
    <div v-if="resolvedPoint" class="space-y-4">
      <!-- Code Badge -->
      <div class="flex items-center gap-2">
        <span
          class="font-mono font-bold text-sm px-2 py-1 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded cursor-pointer hover:bg-[hsl(var(--primary)/0.2)] selection:bg-transparent"
          @click="copyPointCode(resolvedPoint.code || resolvedPoint.id)"
        >
          {{ resolvedPoint.code || resolvedPoint.id }}
        </span>
      </div>

      <!-- Description -->
      <p class="text-sm font-medium text-[hsl(var(--foreground))]">{{ resolvedPoint.label }}</p>

      <!-- Extended Description -->
      <details v-if="longDescription" class="group">
        <summary class="text-xs font-semibold text-[hsl(var(--primary))] cursor-pointer flex items-center gap-1">
          <UIcon name="i-heroicons-chevron-right" class="w-3 h-3 group-open:rotate-90 transition-transform" />
          Descrizione Estesa
        </summary>
        <div class="mt-2 p-3 bg-[hsl(var(--muted)/0.3)] rounded-lg max-h-48 overflow-y-auto text-xs">
          {{ longDescription }}
        </div>
      </details>

      <!-- Info Cards -->
      <div class="grid grid-cols-2 gap-2">
        <div v-if="resolvedPoint.price != null" class="p-3 bg-[hsl(var(--success-light))] rounded-lg border border-[hsl(var(--success)/0.3)] text-[hsl(var(--success))] font-bold text-sm">
          {{ formatCurrency(resolvedPoint.price) }}
        </div>
        <div v-if="resolvedPoint.unit" class="p-3 bg-[hsl(var(--muted)/0.3)] rounded-lg border border-[hsl(var(--border))] text-sm font-medium">
          {{ resolvedPoint.unit }}
        </div>
      </div>

      <!-- Project Info -->
      <div class="p-3 bg-[hsl(var(--muted)/0.3)] rounded-lg border border-[hsl(var(--border))]">
        <div class="panel-section-header mb-1">Progetto</div>
        <div class="text-xs font-medium">{{ resolvedPoint.project_name }}</div>
      </div>

      <!-- WBS -->
      <div v-if="resolvedPoint.wbs06" class="p-3 bg-[hsl(var(--muted)/0.3)] rounded-lg border border-[hsl(var(--border))]">
        <div class="panel-section-header mb-1">WBS</div>
        <div class="text-xs">
          <span class="font-mono font-bold">{{ resolvedPoint.wbs06 }}</span> <span class="text-[hsl(var(--muted-foreground))]">—</span> {{ resolvedPoint.wbs06_desc }}
        </div>
      </div>

      <!-- Extracted Properties -->
      <div v-if="hasProperties && propertyEntries.length" class="space-y-2 pt-2 border-t border-[hsl(var(--border))]">
        <h4 class="panel-section-header">Proprietà Estratte</h4>
        <div class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          <div
            v-for="entry in propertyEntries"
            :key="entry.key"
            class="p-2 bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded text-xs"
          >
            <span class="font-semibold text-[hsl(var(--foreground))]">{{ entry.key }}:</span> 
            <span class="text-[hsl(var(--muted-foreground))] ml-1">{{ formatPropertyValue(entry.value) }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="text-xs text-[hsl(var(--muted-foreground))]">
      Nessun dettaglio disponibile
    </div>
  </SidebarModule>
</template>
