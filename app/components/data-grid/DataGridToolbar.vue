<template>
  <div
    class="flex flex-wrap items-center gap-4 px-6 py-4 bg-transparent"
  >
    <!-- Search input (Taller, Cleaner) -->
    <div class="flex items-center gap-2 flex-1 min-w-[320px]">
      <div class="relative w-full max-w-md">
        <Icon 
          name="heroicons:magnifying-glass" 
          class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-[hsl(var(--muted-foreground))]"
        />
        <UInput
          v-model="searchModel"
          :placeholder="placeholder"
          size="xl"
          variant="none"
          class="w-full"
          :ui="{
            base: 'w-full h-11 pl-11 pr-4 bg-[hsl(var(--background))] border border-transparent hover:border-[hsl(var(--border))] focus:border-[hsl(var(--primary))] rounded-2xl transition-all shadow-sm text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]',
            padding: { xl: 'px-4 py-2.5' }
          }"
          @keydown.enter.prevent="$emit('apply-filter')"
          @clear="$emit('clear-filter')"
        >
          <template #trailing v-if="searchModel">
             <UButton
              color="neutral"
              variant="link"
              icon="i-heroicons-x-mark-20-solid"
              :padded="false"
              @click="$emit('clear-filter')"
            />
          </template>
        </UInput>
      </div>
    </div>
    
    <!-- Actions (Pills) -->
    <div class="flex items-center gap-3">
      <!-- Reset (Ghost Pill) -->
      <button
        v-if="enableReset"
        type="button"
        class="flex items-center justify-center h-10 px-4 rounded-full text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--background))] hover:text-[hsl(var(--foreground))] transition-colors"
        aria-label="Reset filtri"
        @click="$emit('clear-filter')"
      >
        <Icon name="heroicons:arrow-path" class="w-4 h-4 mr-2" />
        Reset
      </button>
      
      <!-- Filtra (Primary Pill) -->
      <button
        type="button"
        class="flex items-center justify-center h-10 px-6 rounded-full text-sm font-medium bg-[hsl(var(--primary))] text-white shadow-md hover:shadow-lg hover:brightness-110 active:scale-95 transition-all"
        aria-label="Applica filtro"
        @click="$emit('apply-filter')"
      >
        <Icon name="heroicons:funnel" class="w-4 h-4 mr-2" />
        Filtra
      </button>
      
      <!-- Esporta (Outline Pill) -->
      <button
        v-if="enableExport"
        type="button"
        class="btn-outline-theme h-10 px-5"
        aria-label="Esporta"
        @click="$emit('export')"
      >
        Esporta
      </button>

      <!-- Colonne (Outline Pill) -->
      <button
        v-if="enableColumnToggle"
        type="button"
        class="btn-outline-theme h-10 px-5"
        aria-label="Colonne"
        @click="(e: any) => $emit('toggle-columns', e.currentTarget)"
      >
        <Icon name="heroicons:view-columns" class="w-4 h-4 mr-2" />
        Colonne
      </button>
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
