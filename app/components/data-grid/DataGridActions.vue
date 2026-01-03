<script setup lang="ts">
import { computed } from 'vue';

type RowActionParams = {
  data?: Record<string, unknown>;
  context?: {
    rowActions?: {
      open?: (row: Record<string, unknown> | undefined) => void;
      viewPricelist?: (row: Record<string, unknown> | undefined) => void;
      viewOffer?: (row: Record<string, unknown> | undefined) => void;
      resolve?: (row: Record<string, unknown> | undefined) => void;
      edit?: (row: Record<string, unknown> | undefined) => void;
      remove?: (row: Record<string, unknown> | undefined) => void;
    };
    hasAlerts?: (row: Record<string, unknown> | undefined) => boolean;
  };
};

const props = defineProps<{
  params: RowActionParams;
}>();

const row = computed(() => props.params?.data);
const actions = computed(() => props.params?.context?.rowActions || {});
const hasAlerts = computed(() => props.params?.context?.hasAlerts?.(row.value) ?? false);

const runAction = (key: keyof typeof actions.value) => {
  actions.value[key]?.(row.value);
};
</script>

<template>
  <div class="flex items-center justify-end h-full w-full gap-2 pr-2" @click.stop>
    
    <!-- View Pricelist -->
    <UTooltip v-if="actions.viewPricelist" text="Vedi Listino">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-list-bullet"
        size="xs"
        class="transition-colors hover:bg-[hsl(var(--success-light))] hover:text-[hsl(var(--success))]"
        @click="runAction('viewPricelist')"
      />
    </UTooltip>

    <!-- View Offer Document -->
    <UTooltip v-if="actions.viewOffer" text="Vedi Documento">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-document-text"
        size="xs"
        class="transition-colors hover:bg-[hsl(var(--info-light))] hover:text-[hsl(var(--info))]"
        @click="runAction('viewOffer')"
      />
    </UTooltip>

    <!-- Generic Open -->
    <UTooltip v-if="actions.open" text="Apri">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-right-circle"
        size="xs"
        class="transition-colors hover:bg-[hsl(var(--primary)/0.15)] hover:text-[hsl(var(--primary))]"
        @click="runAction('open')"
      />
    </UTooltip>

    <!-- Resolve Alerts (Only if configured AND has alerts) -->
    <UTooltip v-if="actions.resolve && hasAlerts" text="Risolvi conflitti">
      <UButton
        color="warning"
        variant="soft"
        icon="i-heroicons-wrench-screwdriver"
        size="xs"
        class="animate-pulse"
        @click="runAction('resolve')"
      />
    </UTooltip>

    <div v-if="(actions.open || actions.viewPricelist || actions.viewOffer) && (actions.edit || actions.remove)" class="h-4 w-px bg-[hsl(var(--border))]" />

    <!-- Edit -->
    <UTooltip v-if="actions.edit" text="Modifica">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-pencil-square"
        size="xs"
        class="transition-colors hover:bg-[hsl(var(--muted))]"
        @click="runAction('edit')"
      />
    </UTooltip>

    <!-- Remove -->
    <UTooltip v-if="actions.remove" text="Elimina">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-trash"
        size="xs"
        class="transition-colors hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-600"
        @click="runAction('remove')"
      />
    </UTooltip>
  </div>
</template>
