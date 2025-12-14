<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  params: any;
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
  <div class="flex items-center justify-end gap-1 h-full w-full pr-1">
    <UTooltip text="Dettaglio">
      <button
        type="button"
        class="inline-flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.55)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.12)] hover:text-[hsl(var(--primary))]"
        aria-label="Apri dettaglio"
        @click.stop="onOpen"
      >
        <Icon name="heroicons:eye" class="w-4 h-4" />
      </button>
    </UTooltip>
    
    <UTooltip text="Modifica">
      <button
        type="button"
        class="inline-flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--warning)/0.55)] text-[hsl(var(--warning))] hover:bg-[hsl(var(--warning)/0.12)] hover:text-[hsl(var(--warning))]"
        aria-label="Modifica"
        @click.stop="onEdit"
      >
        <Icon name="heroicons:pencil-square" class="w-4 h-4" />
      </button>
    </UTooltip>
    
    <UTooltip text="Elimina">
      <button
        type="button"
        class="inline-flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--destructive)/0.55)] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.12)] hover:text-[hsl(var(--destructive))]"
        aria-label="Elimina"
        @click.stop="onDelete"
      >
        <Icon name="heroicons:trash" class="w-4 h-4" />
      </button>
    </UTooltip>
  </div>
</template>
