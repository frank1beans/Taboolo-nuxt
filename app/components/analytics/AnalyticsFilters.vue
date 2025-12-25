<template>
  <div class="p-3 border-b border-[hsl(var(--border))] space-y-3">
    <h3 class="font-bold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Filtri</h3>
    
    <!-- Project Filter -->
    <div>
      <label class="text-[10px] text-[hsl(var(--muted-foreground))] block mb-1">Progetti</label>
      <USelectMenu
        :model-value="selectedProjects"
        @update:model-value="$emit('update:selectedProjects', $event)"
        :items="projectOptions"
        value-key="value"
        multiple
        placeholder="Tutti i progetti"
        class="w-full"
      />
    </div>
    
    <!-- Year Filter -->
    <div>
      <label class="text-[10px] text-[hsl(var(--muted-foreground))] block mb-1">Anno</label>
      <USelectMenu
        :model-value="selectedYear"
        @update:model-value="$emit('update:selectedYear', $event)"
        :items="yearOptions"
        value-key="value"
        placeholder="Tutti gli anni"
        class="w-full"
      />
    </div>
    
    <!-- Business Unit Filter -->
    <div>
      <label class="text-[10px] text-[hsl(var(--muted-foreground))] block mb-1">Business Unit</label>
      <USelectMenu
        :model-value="selectedBU"
        @update:model-value="$emit('update:selectedBU', $event)"
        :items="buOptions"
        value-key="value"
        placeholder="Tutte le BU"
        class="w-full"
      />
    </div>
    
    <!-- Apply Filters Button -->
    <UButton 
      block 
      variant="soft" 
      color="primary" 
      @click="$emit('applyFilters')" 
      :loading="isLoading"
      icon="i-heroicons-funnel"
      size="sm"
    >
      Applica Filtri
    </UButton>
    
    <!-- Compute Map Button -->
    <UButton 
      block 
      variant="outline" 
      color="warning" 
      @click="$emit('computeMap')" 
      :loading="isComputing"
      icon="i-heroicons-cpu-chip"
      size="sm"
    >
      Calcola UMAP
    </UButton>
  </div>
</template>

<script setup lang="ts">
interface SelectOption {
  label: string;
  value: string | number | null;
}

defineProps<{
  selectedProjects: SelectOption[];
  selectedYear: SelectOption | null;
  selectedBU: SelectOption | null;
  projectOptions: SelectOption[];
  yearOptions: SelectOption[];
  buOptions: SelectOption[];
  isLoading: boolean;
  isComputing: boolean;
}>();

defineEmits<{
  'update:selectedProjects': [value: SelectOption[]];
  'update:selectedYear': [value: SelectOption | null];
  'update:selectedBU': [value: SelectOption | null];
  'applyFilters': [];
  'computeMap': [];
}>();
</script>
