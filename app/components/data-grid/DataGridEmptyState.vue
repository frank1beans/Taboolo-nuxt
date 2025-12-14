<template>
  <div class="flex flex-col items-center justify-center h-full min-h-[400px] text-[hsl(var(--muted-foreground))]">
    <!-- Illustration -->
    <div class="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
      <Icon 
        name="heroicons:document-magnifying-glass" 
        class="w-10 h-10 text-[hsl(var(--muted-foreground))]"
      />
    </div>
    
    <h3 class="text-lg font-semibold mb-2 text-[hsl(var(--foreground))]">
      {{ title }}
    </h3>
    
    <p class="text-sm max-w-sm text-center text-[hsl(var(--muted-foreground))]">
      {{ message }}
    </p>
    
    <UButton
      v-if="showAction"
      color="primary"
      size="md"
      icon="i-heroicons-arrow-path"
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
