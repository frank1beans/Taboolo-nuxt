<template>
  <UModal v-model:open="isOpen" :ui="{ width: 'sm:max-w-md' }">
    <template #content>
      <div class="rounded-xl overflow-hidden bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
        <!-- Header -->
        <div class="px-5 py-4 border-b flex items-center justify-between border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]">
              <Icon name="heroicons:funnel" class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">
                Filtra: {{ panel?.label }}
              </h3>
              <p class="text-xs text-[hsl(var(--muted-foreground))]">
                Seleziona un filtro o cerca un valore
              </p>
            </div>
          </div>
          <UButton
            icon="i-heroicons-x-mark"
            variant="ghost"
            color="gray"
            size="sm"
            @click="closeModal"
          />
        </div>

        <!-- Search Input -->
        <div class="px-5 py-3 border-b border-[hsl(var(--border))]">
          <div class="relative">
            <Icon
              name="heroicons:magnifying-glass"
              class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cerca un valore..."
              class="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border transition-colors bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:ring-1 focus:ring-[hsl(var(--ring)/0.6)]"
              @keydown.enter="applySearchFilter"
            >
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="px-5 py-3 border-b space-y-1 border-[hsl(var(--border))]">
          <p class="text-[10px] uppercase tracking-wider font-semibold mb-2 text-[hsl(var(--muted-foreground))]">
            Azioni rapide
          </p>

          <button
            type="button"
            class="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
            @click="applyFilter(null, 'equals')"
          >
            <div class="w-7 h-7 rounded-md flex items-center justify-center bg-[hsl(var(--primary)/0.15)]">
              <Icon name="heroicons:check-circle" class="w-4 h-4 text-[hsl(var(--primary))]" />
            </div>
            <span>Mostra tutto</span>
          </button>

          <button
            type="button"
            class="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
            @click="applyFilter('', 'blank')"
          >
            <div class="w-7 h-7 rounded-md flex items-center justify-center bg-[hsl(var(--warning)/0.2)]">
              <Icon name="heroicons:minus-circle" class="w-4 h-4 text-[hsl(var(--warning))]" />
            </div>
            <span>Solo valori vuoti</span>
          </button>

          <button
            type="button"
            class="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
            @click="applyFilter('__not_blank__', 'notBlank')"
          >
            <div class="w-7 h-7 rounded-md flex items-center justify-center bg-[hsl(var(--success)/0.18)]">
              <Icon name="heroicons:plus-circle" class="w-4 h-4 text-[hsl(var(--success))]" />
            </div>
            <span>Solo valori non vuoti</span>
          </button>
        </div>

        <!-- Values List -->
        <div v-if="filteredOptions.length > 0">
          <p class="px-5 py-2 text-[10px] uppercase tracking-wider font-semibold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))]">
            Valori disponibili ({{ filteredOptions.length }})
          </p>

          <div class="max-h-[200px] overflow-y-auto">
            <button
              v-for="opt in filteredOptions"
              :key="opt"
              type="button"
              class="group w-full text-left px-5 py-2.5 text-sm flex items-center gap-3 transition-colors border-b last:border-b-0 border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
              @click="applyFilter(opt, 'equals')"
            >
              <Icon
                name="heroicons:tag"
                class="w-4 h-4 text-[hsl(var(--muted-foreground))]"
              />
              <span class="truncate flex-1">{{ opt }}</span>
              <Icon
                name="heroicons:chevron-right"
                class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[hsl(var(--muted-foreground))]"
              />
            </button>
          </div>
        </div>

        <!-- Empty state for filtered options -->
        <div
          v-else-if="searchQuery && panel?.options?.length"
          class="px-5 py-8 text-center text-[hsl(var(--muted-foreground))]"
        >
          <Icon name="heroicons:magnifying-glass" class="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p class="text-sm">Nessun valore trovato per "{{ searchQuery }}"</p>
        </div>

        <!-- Footer with Apply Search -->
        <div class="px-5 py-4 border-t flex items-center justify-between gap-3 border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
          <p class="text-xs text-[hsl(var(--muted-foreground))]">
            <span v-if="searchQuery">Premi invio o clicca per filtrare con "{{ searchQuery }}"</span>
            <span v-else>Seleziona un valore o cerca</span>
          </p>
          <UButton
            v-if="searchQuery"
            color="primary"
            size="sm"
            icon="i-heroicons-funnel"
            @click="applySearchFilter"
          >
            Applica filtro
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { FilterPanelState } from '~/types/data-grid';

const props = defineProps<{
  panel: FilterPanelState | null;
}>();

const emit = defineEmits<{
  'apply-filter': [field: string, value: string | null, mode: 'equals' | 'blank' | 'notBlank' | 'contains'];
  close: [];
}>();

const searchQuery = ref('');

const isOpen = computed({
  get: () => props.panel !== null,
  set: (value) => {
    if (!value) {
      emit('close');
    }
  }
});

watch(() => props.panel, (newPanel) => {
  if (newPanel) {
    searchQuery.value = '';
  }
});

const filteredOptions = computed(() => {
  if (!props.panel?.options) return [];
  if (!searchQuery.value) return props.panel.options;

  const query = searchQuery.value.toLowerCase();
  return props.panel.options.filter((opt) =>
    String(opt).toLowerCase().includes(query)
  );
});

const applyFilter = (value: string | null, mode: 'equals' | 'blank' | 'notBlank' | 'contains') => {
  if (!props.panel?.field) return;
  emit('apply-filter', props.panel.field, value, mode);
};

const applySearchFilter = () => {
  if (!props.panel?.field || !searchQuery.value) return;
  emit('apply-filter', props.panel.field, searchQuery.value, 'contains');
};

const closeModal = () => {
  emit('close');
};
</script>
