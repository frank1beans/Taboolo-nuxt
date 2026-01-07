<script setup lang="ts">
import { computed, unref, type Ref } from 'vue'
import SidebarModule from '../SidebarModule.vue'
import { formatCurrency, formatNumber } from '~/lib/formatters'
import type { ApiPriceListItem } from '~/types/api'

type MaybeRef<T> = T | Ref<T>

// Define a unified interface for the Item we can display
// This allows passing different types of objects (PriceListItem, ComparisonItem, etc.)
interface DisplayItem {
  id?: string | number
  code?: string | null
  name?: string | null
  description?: string | null
  long_description?: string | null
  extended_description?: string | null
  unit?: string | null
  price?: number | null
  unit_price?: number | null
  quantity?: number | null
  total_quantity?: number | null
  total_amount?: number | null
  importo_totale?: number | null
  
  wbs6_code?: string | null
  wbs6_description?: string | null
  wbs7_code?: string | null
  wbs7_description?: string | null
  
  // Properties can come from different fields
  extracted_properties?: Record<string, any> | null
  extra_metadata?: Record<string, any> | null
  properties?: Record<string, any> | null
  
  [key: string]: any
}

const props = defineProps<{
  item: MaybeRef<DisplayItem | null>
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { copyToClipboard } = useCopyToClipboard()

// Use unref to handle if prop is ref/reactive (as passed via SidebarModules)
const resolvedItem = computed(() => unref(props.item))

const displayCode = computed(() => {
  const i = resolvedItem.value
  if (!i) return ''
  return i.code || i.item_code || i.codice || String(i.id || '-')
})

const displayDescription = computed(() => {
  const i = resolvedItem.value
  if (!i) return ''
  return i.description || i.item_description || i.descrizione || i.name || i.label || ''
})

const longDescription = computed(() => {
  const i = resolvedItem.value
  if (!i) return ''
  return i.long_description || i.extended_description || i.longDescription || i.extendedDescription || ''
})

const displayPrice = computed(() => {
  const i = resolvedItem.value
  if (!i) return null
  return i.price ?? i.unit_price ?? i.prezzo_unitario ?? null
})

const displayQuantity = computed(() => {
  const i = resolvedItem.value
  if (!i) return null
  return i.quantity ?? i.total_quantity ?? i.quantita ?? null
})

const displayAmount = computed(() => {
  const i = resolvedItem.value
  if (!i) return null
  return i.total_amount ?? i.importo_totale ?? null
})

const copyItemCode = () => {
  if (displayCode.value) {
    copyToClipboard(displayCode.value, { title: 'Copiato', description: displayCode.value, color: 'success' })
  }
}

// Properties Resolution
const itemProperties = computed(() => {
  const i = resolvedItem.value
  if (!i) return []
  
  // Prioritize extracted_properties, then standard properties, then extra_metadata
  let propsData = i.extracted_properties || i.properties;
  
  // If not found, check extra_metadata
  if (!propsData && i.extra_metadata) {
    // extra_metadata might contain properties inside
    if (i.extra_metadata.properties) {
      propsData = i.extra_metadata.properties as Record<string, any>
    } else {
       // or be the properties themselves (filtering out system fields?)
       // For now, let's assume extra_metadata IS the bag of properties if no specific key
       propsData = i.extra_metadata
    }
  }

  if (!propsData) return []

  return Object.entries(propsData)
    .map(([key, value]) => ({ 
      key, 
      value: typeof value === 'object' && value !== null && 'value' in value ? (value as any).value : value 
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
})

const formatPropValue = (val: any) => {
  if (val === null || val === undefined) return '-'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

</script>

<template>
  <SidebarModule title="Dettaglio Voce" icon="heroicons:document-text">
    <template #header-actions>
      <UButton
        icon="i-heroicons-x-mark"
        size="xs"
        variant="ghost"
        color="neutral"
        class="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        @click="emit('close')"
      />
    </template>

    <div v-if="resolvedItem" class="space-y-4">
      
      <!-- Identity -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
           <span
            v-if="displayCode"
            class="font-mono font-bold text-sm px-2 py-1 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded cursor-pointer hover:bg-[hsl(var(--primary)/0.2)]"
            title="Copia Codice"
            @click="copyItemCode"
           >
             {{ displayCode }}
           </span>
         </div>
         <p class="text-sm font-medium text-[hsl(var(--foreground))] leading-snug">
           {{ displayDescription }}
         </p>
      </div>

       <!-- Metrics -->
       <div class="grid grid-cols-2 gap-2">
         <div v-if="displayPrice !== null" class="p-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded">
           <div class="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-wider">Prezzo Unitario</div>
           <div class="text-sm font-bold text-[hsl(var(--foreground))] mt-0.5">{{ formatCurrency(displayPrice) }}</div>
         </div>
         <div v-if="displayQuantity !== null" class="p-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded">
           <div class="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-wider">Quantità</div>
           <div class="text-sm font-bold text-[hsl(var(--foreground))] mt-0.5">
             {{ formatNumber(displayQuantity) }}
             <span v-if="resolvedItem.unit" class="text-xs font-normal text-[hsl(var(--muted-foreground))]">{{ resolvedItem.unit }}</span>
           </div>
         </div>
       </div>
       <div v-if="displayAmount !== null" class="p-2 bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded flex justify-between items-center">
          <div class="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-wider">Importo Totale</div>
          <div class="text-sm font-bold text-[hsl(var(--foreground))]">{{ formatCurrency(displayAmount) }}</div>
       </div>

       <!-- Long Description -->
       <div v-if="longDescription && longDescription !== displayDescription" class="p-3 bg-[hsl(var(--muted)/0.3)] rounded-lg text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
         {{ longDescription }}
       </div>

       <!-- WBS Info -->
       <div v-if="resolvedItem.wbs6_description || resolvedItem.wbs6_code" class="p-3 bg-[hsl(var(--muted)/0.2)] rounded-lg border border-[hsl(var(--border))]">
          <div class="panel-section-header mb-2">Classificazione WBS</div>
          <div class="space-y-2">
             <div v-if="resolvedItem.wbs6_code || resolvedItem.wbs6_description">
                <div class="text-[10px] text-[hsl(var(--muted-foreground))] uppercase">Livello 6</div>
                <div class="text-xs">
                   <span class="font-mono font-semibold">{{ resolvedItem.wbs6_code }}</span>
                   <span v-if="resolvedItem.wbs6_description" class="ml-1 text-[hsl(var(--foreground))]">{{ resolvedItem.wbs6_description }}</span>
                </div>
             </div>
             <div v-if="resolvedItem.wbs7_code || resolvedItem.wbs7_description" class="pt-2 border-t border-[hsl(var(--border))/0.5]">
                <div class="text-[10px] text-[hsl(var(--muted-foreground))] uppercase">Livello 7</div>
                 <div class="text-xs">
                   <span class="font-mono font-semibold">{{ resolvedItem.wbs7_code }}</span>
                   <span v-if="resolvedItem.wbs7_description" class="ml-1 text-[hsl(var(--foreground))]">{{ resolvedItem.wbs7_description }}</span>
                </div>
             </div>
          </div>
       </div>

       <!-- Properties -->
       <div v-if="itemProperties.length" class="space-y-2 pt-2 border-t border-[hsl(var(--border))]">
          <h4 class="panel-section-header flex items-center gap-2">
            Proprietà
            <span class="px-1.5 py-0.5 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-[10px] font-bold">{{ itemProperties.length }}</span>
          </h4>
          <div class="space-y-1">
             <div 
               v-for="prop in itemProperties" 
               :key="prop.key"
               class="p-2 bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded text-xs flex justify-between items-start gap-2"
             >
                <span class="font-medium text-[hsl(var(--muted-foreground))] shrink-0">{{ prop.key }}:</span>
                <span class="text-[hsl(var(--foreground))] text-right break-words">{{ formatPropValue(prop.value) }}</span>
             </div>
          </div>
       </div>
       <div v-else class="text-center py-6 text-xs text-[hsl(var(--muted-foreground))] italic">
          Nessuna proprietà estratta disponibile
       </div>
       
       <!-- Raw Metadata (Debug / Extra) -->
       <details v-if="resolvedItem.extra_metadata" class="text-xs group pt-2 border-t border-[hsl(var(--border))]">
          <summary class="text-[hsl(var(--muted-foreground))] cursor-pointer hover:text-[hsl(var(--foreground))] font-medium">Metadati Raw</summary>
          <pre class="mt-2 p-2 bg-[hsl(var(--muted))] rounded overflow-x-auto font-mono text-[10px] text-[hsl(var(--muted-foreground))]">{{ JSON.stringify(resolvedItem.extra_metadata, null, 2) }}</pre>
       </details>

    </div>
    <div v-else class="flex flex-col items-center justify-center h-48 text-[hsl(var(--muted-foreground))]">
      <Icon name="heroicons:cursor-arrow-rays" class="w-8 h-8 mb-2 opacity-50" />
      <span class="text-xs">Fai doppio clic su una voce per i dettagli</span>
    </div>
  </SidebarModule>
</template>

<style scoped>
.panel-section-header {
  font-size: 0.75rem; /* text-xs */
  font-weight: 700;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
  letter-spacing: 0.05em;
}
</style>
