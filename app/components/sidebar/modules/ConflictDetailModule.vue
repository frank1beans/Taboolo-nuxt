<script setup lang="ts">
import { ref, computed, watch, resolveComponent } from 'vue';
import SidebarModule from '~/components/sidebar/SidebarModule.vue';
import type { ApiOfferAlert } from '~/types/api';
import type { ApiPriceListItemCandidate } from '~/lib/api/offers';
import { offersApi } from '~/lib/api/offers';
import { useRoute } from 'vue-router';
import { formatCurrency, formatNumber } from '~/lib/formatters';

const props = defineProps<{
  selectedAlert?: ApiOfferAlert | null;
  estimateName?: string;
  offerName?: string;
}>();

const emit = defineEmits<{
  (e: 'close-detail'): void;
  (e: 'resolve' | 'ignore' | 'reopen', alert: ApiOfferAlert): void;
  (e: 'resolve-with-candidate', alert: ApiOfferAlert, candidateId: string): void;
}>();

const route = useRoute();
const projectId = computed(() => route.params.id as string);

// Type labels
const typeLabels: Record<string, string> = {
  price_mismatch: 'Prezzo',
  quantity_mismatch: 'Quantità',
  code_mismatch: 'Codice',
  missing_baseline: 'Baseline',
  ambiguous_match: 'Ambiguo',
  addendum: 'Addendum',
};

const statusLabels: Record<string, string> = {
  open: 'Aperto',
  resolved: 'Risolto',
  ignored: 'Ignorato',
};

const formatValue = (value: number | string | null | undefined, type: string) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') {
    if (type === 'price_mismatch') return formatCurrency(value);
    return formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 3, fallback: '-' });
  }
  return String(value);
};

// Candidate selection for ambiguous matches
const candidates = ref<ApiPriceListItemCandidate[]>([]);
const selectedCandidateId = ref<string | null>(null);
const loadingCandidates = ref(false);
const resolvingWithCandidate = ref(false);

const isAmbiguousMatch = computed(() => props.selectedAlert?.type === 'ambiguous_match');
const hasCandidates = computed(() => (props.selectedAlert?.candidate_price_list_item_ids?.length ?? 0) > 0);

watch(() => props.selectedAlert?.id, async (newAlertId) => {
  candidates.value = [];
  selectedCandidateId.value = null;
  
  if (!newAlertId || !isAmbiguousMatch.value || !hasCandidates.value) return;
  
  loadingCandidates.value = true;
  try {
    const result = await offersApi.getAlertCandidates(projectId.value, newAlertId);
    candidates.value = result.candidates || [];
    if (candidates.value.length === 1 && candidates.value[0]) {
      selectedCandidateId.value = candidates.value[0].id;
    }
  } catch (err) {
    console.error('Failed to fetch candidates', err);
  } finally {
    loadingCandidates.value = false;
  }
}, { immediate: true });

const candidateOptions = computed(() => 
  candidates.value.map(c => ({
    label: `${c.code || 'N/A'} - ${(c.description || c.long_description || 'Nessuna descrizione').substring(0, 50)}`,
    value: c.id,
  }))
);

const selectedCandidate = computed(() => 
  candidates.value.find(c => c.id === selectedCandidateId.value)
);

const resolveWithCandidate = async () => {
  if (!props.selectedAlert || !selectedCandidateId.value) return;
  resolvingWithCandidate.value = true;
  try {
    await offersApi.resolveAlert(projectId.value, props.selectedAlert.id, {
      status: 'resolved',
      selected_price_list_item_id: selectedCandidateId.value,
    });
    emit('resolve-with-candidate', props.selectedAlert, selectedCandidateId.value);
  } catch (err) {
    console.error('Failed to resolve with candidate', err);
  } finally {
    resolvingWithCandidate.value = false;
  }
};
</script>

<template>
  <SidebarModule title="Dettagli" icon="i-heroicons-document-magnifying-glass" default-open>
    <div v-if="selectedAlert" class="space-y-6">
      <!-- Status Banner -->
      <div 
        class="rounded-lg p-3 border"
        :class="{
          'bg-[hsl(var(--warning-light))] border-[hsl(var(--warning)/0.3)]': (selectedAlert.status || 'open') === 'open',
          'bg-[hsl(var(--success-light))] border-[hsl(var(--success)/0.3)]': selectedAlert.status === 'resolved',
          'bg-[hsl(var(--muted))] border-[hsl(var(--border))]': selectedAlert.status === 'ignored',
        }"
      >
        <div class="flex flex-col">
          <span class="text-[10px] uppercase font-bold opacity-70">Stato</span>
          <span class="font-medium text-sm">{{ statusLabels[selectedAlert.status || 'open'] }}</span>
        </div>
      </div>

      <!-- Alert Info -->
      <div class="space-y-3">
        <div>
          <div class="panel-section-header mb-1">
            {{ typeLabels[selectedAlert.type] || selectedAlert.type }}
          </div>
          <div class="text-sm font-medium text-[hsl(var(--foreground))] leading-tight">
            {{ selectedAlert.message }}
          </div>
          <div v-if="selectedAlert.imported_description" class="mt-2 text-xs text-[hsl(var(--muted-foreground))] italic">
            "{{ selectedAlert.imported_description.substring(0, 80) }}{{ selectedAlert.imported_description.length > 80 ? '...' : '' }}"
          </div>
        </div>
        
        <div class="grid grid-cols-1 gap-2">
          <div class="p-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)]">
            <div class="panel-section-header mb-0.5">Preventivo</div>
            <div class="text-sm font-semibold truncate" :title="estimateName">{{ estimateName || 'N/D' }}</div>
          </div>
          <div class="p-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)]">
            <div class="panel-section-header mb-0.5">Offerta</div>
            <div class="text-sm font-semibold truncate" :title="offerName">{{ offerName || 'N/D' }}</div>
          </div>
        </div>
      </div>

      <!-- Candidate Selection for Ambiguous Matches -->
      <div v-if="isAmbiguousMatch && (selectedAlert.status || 'open') === 'open'" class="space-y-3 pt-3 border-t border-[hsl(var(--border)/0.5)]">
        <h4 class="panel-section-header">
          Codici Candidati ({{ candidates.length }})
        </h4>
        
        <div v-if="loadingCandidates" class="flex items-center justify-center py-3">
          <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
        
        <template v-else-if="candidates.length > 0">
          <USelect
            v-model="selectedCandidateId"
            :items="candidateOptions"
            placeholder="Seleziona codice..."
            class="w-full"
            size="sm"
          />
          
          <div v-if="selectedCandidate" class="p-2.5 rounded-lg border border-primary/30 bg-primary/5 space-y-1.5">
            <div class="flex justify-between items-start">
              <span class="text-[10px] text-[hsl(var(--muted-foreground))]">Codice:</span>
              <span class="font-mono font-medium text-xs">{{ selectedCandidate.code || 'N/A' }}</span>
            </div>
            <div v-if="selectedCandidate.description || selectedCandidate.long_description" class="text-[11px] text-[hsl(var(--foreground))]">
              {{ (selectedCandidate.description || selectedCandidate.long_description || '').substring(0, 100) }}
            </div>
            <div v-if="selectedCandidate.price" class="flex justify-between items-center text-[10px]">
              <span class="text-[hsl(var(--muted-foreground))]">Prezzo:</span>
              <span class="font-mono font-medium">{{ formatCurrency(selectedCandidate.price) }}</span>
            </div>
          </div>
          
          <UButton
            block
            color="primary"
            icon="i-heroicons-check-circle"
            size="sm"
            :loading="resolvingWithCandidate"
            :disabled="!selectedCandidateId"
            @click="resolveWithCandidate"
          >
            Associa e Risolvi
          </UButton>
        </template>
        
        <div v-else class="text-xs text-[hsl(var(--muted-foreground))] text-center py-2">
          Nessun candidato disponibile
        </div>
      </div>

      <!-- Comparison Values (for non-ambiguous) -->
      <div v-if="!isAmbiguousMatch && selectedAlert.actual !== undefined" class="space-y-2 pt-3 border-t border-[hsl(var(--border)/0.5)]">
        <h4 class="panel-section-header mb-2">Confronto</h4>
        
        <div class="grid grid-cols-3 gap-1.5 text-center">
          <div class="p-2 rounded bg-[hsl(var(--muted)/0.2)]">
            <div class="text-[9px] text-[hsl(var(--muted-foreground))] uppercase mb-0.5">Attuale</div>
            <div class="font-mono font-medium text-xs">{{ formatValue(selectedAlert.actual, selectedAlert.type) }}</div>
          </div>
          <div class="p-2 rounded bg-[hsl(var(--muted)/0.2)]">
            <div class="text-[9px] text-[hsl(var(--muted-foreground))] uppercase mb-0.5">Atteso</div>
            <div class="font-mono font-medium text-xs text-[hsl(var(--muted-foreground))]">{{ formatValue(selectedAlert.expected, selectedAlert.type) }}</div>
          </div>
          <div class="p-2 rounded bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))]">
            <div class="text-[9px] text-[hsl(var(--muted-foreground))] uppercase mb-0.5">Delta</div>
            <div class="font-mono font-bold text-xs" :class="selectedAlert.delta !== 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--muted-foreground))]'">
              {{ formatValue(selectedAlert.delta, selectedAlert.type) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="pt-3 mt-auto border-t border-[hsl(var(--border)/0.5)]">
        <div v-if="(selectedAlert.status || 'open') === 'open' && !isAmbiguousMatch" class="grid grid-cols-2 gap-2">
          <UButton 
            block 
            color="primary" 
            size="sm"
            icon="i-heroicons-check-circle"
            @click="emit('resolve', selectedAlert)"
          >
            Risolvi
          </UButton>
          <UButton 
            block 
            color="neutral" 
            variant="soft"
            size="sm"
            icon="i-heroicons-eye-slash"
            @click="emit('ignore', selectedAlert)"
          >
            Ignora
          </UButton>
        </div>
        <div v-else-if="(selectedAlert.status || 'open') === 'open' && isAmbiguousMatch && !candidates.length" class="grid grid-cols-2 gap-2">
           <UButton 
            block 
            color="primary" 
            size="sm"
            icon="i-heroicons-check-circle"
            @click="emit('resolve', selectedAlert)"
          >
            Risolvi
          </UButton>
          <UButton 
            block 
            color="neutral" 
            variant="soft"
            size="sm"
            icon="i-heroicons-eye-slash"
            @click="emit('ignore', selectedAlert)"
          >
            Ignora
          </UButton>
        </div>
        <div v-else-if="selectedAlert.status !== 'open'">
          <UButton 
            block 
            color="neutral" 
            variant="outline"
            size="sm"
            icon="i-heroicons-arrow-path"
            @click="emit('reopen', selectedAlert)"
          >
            Riapri
          </UButton>
        </div>
      </div>
    </div>
    
    <div v-else class="text-center py-6">
      <div class="w-10 h-10 mx-auto rounded-full bg-[hsl(var(--muted))/0.5] flex items-center justify-center mb-3">
         <UIcon name="i-heroicons-cursor-arrow-rays" class="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
      </div>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">
        Seleziona un conflitto dalla tabella per visualizzare i dettagli
      </p>
    </div>
  </SidebarModule>
</template>
