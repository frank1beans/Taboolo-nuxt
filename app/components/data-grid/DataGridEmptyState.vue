<template>
  <div class="flex flex-col items-center justify-center h-full min-h-[400px] text-[hsl(var(--muted-foreground))]">
    <!-- Illustration -->
    <div 
      class="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 border"
      :class="hasActiveFilters 
        ? 'bg-[hsl(var(--warning-light))] border-[hsl(var(--warning)/0.2)]' 
        : 'bg-[hsl(var(--muted))] border-[hsl(var(--border))]'"
    >
      <Icon 
        :name="hasActiveFilters ? 'heroicons:funnel' : 'heroicons:document-magnifying-glass'" 
        class="w-10 h-10"
        :class="hasActiveFilters ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--muted-foreground))]'"
      />
    </div>
    
    <h3 class="text-lg font-semibold mb-2 text-[hsl(var(--foreground))]">
      {{ displayTitle }}
    </h3>
    
    <p class="text-sm max-w-sm text-center text-[hsl(var(--muted-foreground))]">
      {{ displayMessage }}
    </p>
    
    <div class="flex items-center gap-3 mt-6">
      <!-- Primary Action -->
      <UButton
        v-if="showAction"
        color="primary"
        size="md"
        :icon="hasActiveFilters ? 'i-heroicons-x-mark' : 'i-heroicons-arrow-path'"
        @click="$emit('action')"
      >
        {{ displayActionLabel }}
      </UButton>

      <!-- Secondary Action -->
      <UButton
        v-if="showSecondaryAction"
        color="neutral"
        variant="outline"
        size="md"
        :icon="secondaryIcon"
        @click="$emit('secondary-action')"
      >
        {{ secondaryActionLabel }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string;
    message?: string;
    showAction?: boolean;
    actionLabel?: string;
    hasActiveFilters?: boolean;
    filterTitle?: string;
    filterMessage?: string;
    filterActionLabel?: string;
    showSecondaryAction?: boolean;
    secondaryActionLabel?: string;
    secondaryIcon?: string;
  }>(),
  {
    title: 'Nessun dato disponibile',
    message: 'Non ci sono dati da visualizzare in questo momento.',
    showAction: false,
    actionLabel: 'Ricarica',
    hasActiveFilters: false,
    filterTitle: 'Nessun risultato',
    filterMessage: 'Nessuna voce risponde ai filtri selezionati. Prova a modificare i criteri di ricerca.',
    filterActionLabel: 'Rimuovi filtri',
    showSecondaryAction: false,
    secondaryActionLabel: 'Azione',
    secondaryIcon: 'i-heroicons-plus',
  }
);

const displayTitle = computed(() => 
  props.hasActiveFilters ? props.filterTitle : props.title
)

const displayMessage = computed(() => 
  props.hasActiveFilters ? props.filterMessage : props.message
)

const displayActionLabel = computed(() =>
  props.hasActiveFilters ? props.filterActionLabel : props.actionLabel
)

defineEmits<{
  action: [];
  'secondary-action': [];
}>();
</script>

