<script setup lang="ts">
/**
 * ConflictBatchActions.vue - Modular batch actions component
 */
defineProps<{
  selectedCount: number;
  loading?: boolean;
  canApplyPrices?: boolean;
}>();

const emit = defineEmits<{
  (e: 'resolve' | 'ignore' | 'apply-prices'): void;
}>();
</script>

<template>
  <div class="space-y-2">
    <UButton
      block
      :color="canApplyPrices ? 'warning' : 'primary'"
      :variant="canApplyPrices ? 'solid' : 'soft'"
      size="sm"
      :icon="canApplyPrices ? 'i-heroicons-currency-euro' : 'i-heroicons-check-circle'"
      :disabled="selectedCount === 0"
      :loading="loading"
      @click="canApplyPrices ? emit('apply-prices') : emit('resolve')"
    >
      {{ canApplyPrices ? 'Applica prezzi e Risolvi' : 'Risolvi' }}
    </UButton>
    
    <UButton
      block
      color="neutral"
      variant="soft"
      size="sm"
      icon="i-heroicons-eye-slash"
      :disabled="selectedCount === 0"
      @click="emit('ignore')"
    >
      Ignora
    </UButton>
  </div>
</template>
