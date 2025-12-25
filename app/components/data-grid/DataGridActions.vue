<script setup lang="ts">
import { computed } from 'vue';

type RowActionParams = {
  data?: Record<string, unknown>;
  context?: {
    rowActions?: {
      open?: (row: Record<string, unknown> | undefined) => void;
      edit?: (row: Record<string, unknown> | undefined) => void;
      remove?: (row: Record<string, unknown> | undefined) => void;
    };
  };
};

const props = defineProps<{
  params: RowActionParams;
}>();

const row = computed(() => props.params?.data);

const onOpen = () => {
  props.params?.context?.rowActions?.open?.(row.value);
};

const onEdit = () => {
  props.params?.context?.rowActions?.edit?.(row.value);
};

const onDelete = () => {
  props.params?.context?.rowActions?.remove?.(row.value);
};
</script>

<template>
  <div class="flex items-center justify-end h-full w-full gap-1 pr-2" @click.stop>
    <UTooltip text="Vedi dettaglio">
      <UButton
        color="gray"
        variant="ghost"
        icon="i-heroicons-arrow-right-circle"
        size="xs"
        class="transition-colors hover:bg-[hsl(var(--primary)/0.15)] hover:text-[hsl(var(--primary))]"
        @click="onOpen"
      />
    </UTooltip>

    <UTooltip text="Modifica">
      <UButton
        color="gray"
        variant="ghost"
        icon="i-heroicons-pencil-square"
        size="xs"
        class="transition-colors hover:bg-[hsl(var(--muted))]"
        @click="onEdit"
      />
    </UTooltip>

    <div class="h-4 w-px bg-[hsl(var(--border))]" />

    <UTooltip text="Elimina">
      <UButton
        color="gray"
        variant="ghost"
        icon="i-heroicons-trash"
        size="xs"
        class="transition-colors hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-600"
        @click="onDelete"
      />
    </UTooltip>
  </div>
</template>
