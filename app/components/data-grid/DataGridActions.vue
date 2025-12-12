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
  <div class="flex items-center justify-end gap-1.5 h-full w-full pr-1">
    <UTooltip text="Dettaglio">
      <UButton
        size="sm"
        variant="ghost"
        color="neutral"
        class="text-sky-600 hover:bg-sky-50 transition-transform hover:scale-110"
        @click.stop="onOpen"
      >
        <Icon name="heroicons:eye" class="w-4 h-4" />
      </UButton>
    </UTooltip>
    
    <UTooltip text="Modifica">
      <UButton
        size="sm"
        variant="ghost"
        color="neutral"
        class="text-amber-600 hover:bg-amber-50 transition-transform hover:scale-110"
        @click.stop="onEdit"
      >
        <Icon name="heroicons:pencil-square" class="w-4 h-4" />
      </UButton>
    </UTooltip>
    
    <UTooltip text="Elimina">
      <UButton
        size="sm"
        variant="ghost"
        color="neutral"
        class="text-rose-600 hover:bg-rose-50 transition-transform hover:scale-110"
        @click.stop="onDelete"
      >
        <Icon name="heroicons:trash" class="w-4 h-4" />
      </UButton>
    </UTooltip>
  </div>
</template>
