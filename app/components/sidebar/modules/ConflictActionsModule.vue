<script setup lang="ts">
import SidebarModule from '~/components/sidebar/SidebarModule.vue';
import ConflictBatchActions from '~/components/conflicts/ConflictBatchActions.vue';

defineProps<{
  selectedCount: number;
  loading?: boolean;
  canApplyPrices?: boolean;
}>();

const emit = defineEmits<{
  (e: 'batch-resolve' | 'batch-ignore' | 'batch-apply-prices'): void;
}>();
</script>

<template>
  <SidebarModule title="Azioni rapide" icon="i-heroicons-bolt" default-open>
    <div v-if="selectedCount > 0" class="space-y-4">
       <div class="flex items-center justify-between">
        <span class="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-wider">Selezione</span>
        <span class="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
          {{ selectedCount }} elementi
        </span>
      </div>
      
      <ConflictBatchActions
        :selected-count="selectedCount"
        :loading="loading"
        :can-apply-prices="canApplyPrices"
        @resolve="emit('batch-resolve')"
        @ignore="emit('batch-ignore')"
        @apply-prices="emit('batch-apply-prices')"
      />
    </div>
    
    <div v-else class="text-center py-6">
      <div class="w-10 h-10 mx-auto rounded-full bg-[hsl(var(--muted))/0.5] flex items-center justify-center mb-3">
         <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
      </div>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">
        Seleziona uno o più conflitti per attivare le azioni rapide
      </p>
    </div>
  </SidebarModule>
</template>
