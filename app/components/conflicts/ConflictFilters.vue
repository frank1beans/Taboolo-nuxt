<script setup lang="ts">
/**
 * ConflictFilters.vue - Modular filter component
 */
defineProps<{
  selectedEstimateId: string;
  selectedOfferId: string;
  selectedType: string;
  selectedStatus: string;
  estimateOptions: Array<{ label: string; value: string }>;
  offerOptions: Array<{ label: string; value: string }>;
  typeOptions: Array<{ label: string; value: string }>;
  statusOptions: Array<{ label: string; value: string }>;
  offersDisabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:selectedEstimateId' | 'update:selectedOfferId' | 'update:selectedType' | 'update:selectedStatus', value: string): void;
  (e: 'reset'): void;
}>();
</script>

<template>
  <div class="space-y-3">
    <UFormField label="Preventivo" size="sm">
      <USelectMenu
        :model-value="selectedEstimateId"
        :items="estimateOptions"
        value-key="value"
        size="sm"
        @update:model-value="emit('update:selectedEstimateId', $event)"
      />
    </UFormField>

    <UFormField label="Offerta" size="sm">
      <USelectMenu
        :model-value="selectedOfferId"
        :items="offerOptions"
        value-key="value"
        size="sm"
        :disabled="offersDisabled"
        @update:model-value="emit('update:selectedOfferId', $event)"
      />
    </UFormField>

    <UFormField label="Tipo" size="sm">
      <USelectMenu
        :model-value="selectedType"
        :items="typeOptions"
        value-key="value"
        size="sm"
        @update:model-value="emit('update:selectedType', $event)"
      />
    </UFormField>

    <UFormField label="Stato" size="sm">
      <USelectMenu
        :model-value="selectedStatus"
        :items="statusOptions"
        value-key="value"
        size="sm"
        @update:model-value="emit('update:selectedStatus', $event)"
      />
    </UFormField>

    <UButton
      block
      color="neutral"
      variant="ghost"
      size="xs"
      icon="i-heroicons-x-mark"
      @click="emit('reset')"
    >
      Reset
    </UButton>
  </div>
</template>
