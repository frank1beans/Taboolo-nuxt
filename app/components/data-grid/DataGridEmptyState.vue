<template>
  <div class="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-500">
    <div class="text-6xl mb-4">📋</div>
    <h3 class="text-lg font-semibold text-slate-700 mb-2">{{ title }}</h3>
    <p class="text-sm text-slate-500">{{ message }}</p>
    <UButton
      v-if="showAction"
      color="primary"
      size="md"
      class="mt-6"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    message?: string;
    showAction?: boolean;
    actionLabel?: string;
  }>(),
  {
    title: 'Nessun dato disponibile',
    message: 'Non ci sono dati da visualizzare in questo momento.',
    showAction: false,
    actionLabel: 'Ricarica',
  }
);

defineEmits<{
  action: [];
}>();
</script>
