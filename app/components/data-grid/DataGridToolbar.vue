<template>
  <div
    class="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]"
  >
    <!-- Search input -->
    <div class="flex items-center gap-2 flex-1 min-w-[260px]">
      <div class="relative w-full min-w-[260px]">
        <Icon 
          name="heroicons:magnifying-glass" 
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[hsl(var(--muted-foreground))]"
        />
        <UInput
          v-model="searchModel"
          :placeholder="placeholder"
          size="md"
          clearable
          class="w-full pl-9"
          :ui="{
            base: 'bg-[hsl(var(--secondary))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:ring-[hsl(var(--ring)/0.6)] focus:border-[hsl(var(--ring))]'
          }"
          @keydown.enter.prevent="$emit('apply-filter')"
          @clear="$emit('clear-filter')"
        />
      </div>
    </div>
    
    <!-- Actions -->
    <div class="flex items-center gap-2">
      <UButton
        v-if="enableReset"
        color="gray"
        variant="ghost"
        size="md"
        class="px-4 interactive-touch focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.6)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.6)]"
        aria-label="Reset filtri"
        @click="$emit('clear-filter')"
      >
        <Icon name="heroicons:arrow-path" class="w-4 h-4 mr-1.5" />
        Reset
      </UButton>
      
      <UButton
        color="primary"
        variant="soft"
        size="md"
        class="px-5 interactive-touch focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
        aria-label="Applica filtro"
        @click="$emit('apply-filter')"
      >
        <Icon name="heroicons:funnel" class="w-4 h-4 mr-1.5" />
        Filtra
      </UButton>
      
      <UButton
        v-if="enableExport"
        color="gray"
        variant="outline"
        size="md"
        class="px-4 interactive-touch focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.6)] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.6)] hover:text-[hsl(var(--foreground))]"
        aria-label="Esporta"
        @click="$emit('export')"
      >
        Esporta
      </UButton>

      <UButton
        v-if="enableColumnToggle"
        color="gray"
        variant="outline"
        size="md"
        class="px-4 interactive-touch focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.6)] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.6)] hover:text-[hsl(var(--foreground))]"
        aria-label="Colonne"
        @click="(e: any) => $emit('toggle-columns', e.currentTarget)"
      >
        <Icon name="heroicons:view-columns" class="w-4 h-4 mr-1.5" />
        Colonne
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  enableReset?: boolean;
  enableExport?: boolean;
  enableColumnToggle?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'apply-filter': [];
  'clear-filter': [];
  export: [];
  'toggle-columns': [target: HTMLElement];
}>();

const searchModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});
</script>
