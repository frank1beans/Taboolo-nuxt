<template>
  <UModal :model-value="open" @update:model-value="emit('close')">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold leading-6 text-[hsl(var(--foreground))]">
            Configura Colonne
          </h3>
          <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="emit('close')" />
        </div>
      </template>

      <div class="space-y-4">
        <UInput
          v-model="searchQuery"
          icon="i-heroicons-magnifying-glass-20-solid"
          placeholder="Cerca colonne..."
        >
          <template #trailing>
            <UButton
              v-show="searchQuery !== ''"
              color="neutral"
              variant="link"
              icon="i-heroicons-x-mark-20-solid"
              :padded="false"
              @click="searchQuery = ''"
            />
          </template>
        </UInput>

        <div class="max-h-60 overflow-y-auto space-y-2">
          <div v-if="filteredColumns.length === 0" class="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
            Nessuna colonna trovata
          </div>
          <div
            v-for="col in filteredColumns"
            :key="col.colId"
            class="flex items-center justify-between p-2 rounded-lg hover:bg-[hsl(var(--muted))]"
          >
            <span class="text-sm text-[hsl(var(--foreground))]">{{ col.headerName }}</span>
            <UToggle :model-value="col.visible" @update:model-value="(val: boolean) => emit('toggle', col.colId, val)" />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between">
           <UButton color="neutral" variant="ghost" label="Ripristina Default" @click="emit('reset')" />
           <UButton color="primary" label="Chiudi" @click="emit('close')" />
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface ColumnState {
  colId: string;
  headerName: string;
  visible: boolean;
}

const props = defineProps<{
  open: boolean;
  columns: ColumnState[];
}>();

const emit = defineEmits<{
  close: [];
  toggle: [colId: string, visible: boolean];
  reset: [];
}>();

const searchQuery = ref('');

const filteredColumns = computed(() => {
  if (!searchQuery.value) return props.columns;
  const q = searchQuery.value.toLowerCase();
  return props.columns.filter(c => c.headerName.toLowerCase().includes(q));
});
</script>
