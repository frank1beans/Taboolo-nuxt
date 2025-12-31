<script setup lang="ts">
import SidebarModule from '~/components/sidebar/SidebarModule.vue';
import ConflictStats from '~/components/conflicts/ConflictStats.vue';
import ConflictFilters from '~/components/conflicts/ConflictFilters.vue';

defineProps<{
  // Filter values
  selectedEstimateId: string;
  selectedOfferId: string;
  selectedType: string;
  selectedStatus: string;
  // Options
  estimateOptions: Array<{ label: string; value: string }>;
  offerOptions: Array<{ label: string; value: string }>;
  typeOptions: Array<{ label: string; value: string }>;
  statusOptions: Array<{ label: string; value: string }>;
  // Stats
  alertCount: number;
  pendingCount: number;
  addendumCount: number;
  // Loading
  loading?: boolean;
  offersDisabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:selectedEstimateId' | 'update:selectedOfferId' | 'update:selectedType' | 'update:selectedStatus', value: string): void;
  (e: 'refresh' | 'open-pending' | 'open-addendum'): void;
}>();

const handleReset = () => {
  emit('update:selectedEstimateId', 'all');
  emit('update:selectedOfferId', 'all');
  emit('update:selectedType', 'all');
  emit('update:selectedStatus', 'open');
};
</script>

<template>
  <SidebarModule title="Filtri" icon="i-heroicons-funnel" default-open>
    <div class="space-y-6">
      
      <!-- Stats -->
      <ConflictStats
        :alert-count="alertCount"
        :pending-count="pendingCount"
        :addendum-count="addendumCount"
        @open-pending="emit('open-pending')"
        @open-addendum="emit('open-addendum')"
      />

      <!-- Filters -->
      <div class="pt-2">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Opzioni di filtro</h4>
          <UButton 
            variant="ghost" 
            size="xs" 
            color="neutral" 
            class="h-6 -my-1 text-[10px]"
            @click="handleReset"
          >
            Reset
          </UButton>
        </div>
        
        <ConflictFilters
          :selected-estimate-id="selectedEstimateId"
          :selected-offer-id="selectedOfferId"
          :selected-type="selectedType"
          :selected-status="selectedStatus"
          :estimate-options="estimateOptions"
          :offer-options="offerOptions"
          :type-options="typeOptions"
          :status-options="statusOptions"
          :offers-disabled="offersDisabled"
          @update:selected-estimate-id="emit('update:selectedEstimateId', $event)"
          @update:selected-offer-id="emit('update:selectedOfferId', $event)"
          @update:selected-type="emit('update:selectedType', $event)"
          @update:selected-status="emit('update:selectedStatus', $event)"
          @reset="handleReset"
        />
      </div>

      <!-- Footer Refresh -->
      <div class="pt-2">
        <UButton
          block
          icon="i-heroicons-arrow-path"
          color="neutral"
          variant="soft"
          size="sm"
          :loading="loading"
          @click="emit('refresh')"
        >
          Aggiorna dati
        </UButton>
      </div>
    </div>
  </SidebarModule>
</template>
