<template>
  <div class="p-3 border-b border-[hsl(var(--border))] space-y-3">
    <!-- Color By -->
    <div>
      <label class="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase mb-2 block">Colora per</label>
      <USelectMenu
        :model-value="colorBy"
        @update:model-value="$emit('update:colorBy', $event)"
        :items="colorByOptions"
        value-key="value"
        class="w-full"
      />
    </div>

    <!-- Point Size -->
    <div>
      <div class="flex justify-between items-center mb-1">
        <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Dimensione punti</label>
        <span class="text-[10px] font-mono bg-[hsl(var(--secondary))] px-1 rounded">{{ pointSize }}</span>
      </div>
      <input 
        type="range" 
        :value="pointSize"
        @input="$emit('update:pointSize', Number(($event.target as HTMLInputElement).value))"
        min="2" max="15" step="1"
        class="w-full h-1.5 bg-[hsl(var(--secondary))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--primary))]"
      />
    </div>

    <!-- Show Poles Toggle -->
    <div class="flex items-center justify-between">
      <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Mostra Poli</label>
      <button 
        @click="$emit('update:showPoles', !showPoles)"
        :class="['w-10 h-5 rounded-full transition-colors flex items-center px-0.5', 
          showPoles ? 'bg-[hsl(var(--primary))] justify-end' : 'bg-[hsl(var(--secondary))] justify-start']"
      >
        <span class="w-4 h-4 rounded-full bg-white shadow"></span>
      </button>
    </div>
    
    <!-- 3D Toggle -->
    <div class="flex items-center justify-between">
      <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Vista 3D</label>
      <button 
        @click="$emit('update:is3D', !is3D)"
        :class="['w-10 h-5 rounded-full transition-colors flex items-center px-0.5', 
          is3D ? 'bg-[hsl(var(--primary))] justify-end' : 'bg-[hsl(var(--secondary))] justify-start']"
      >
        <span class="w-4 h-4 rounded-full bg-white shadow"></span>
      </button>
    </div>
    
    <!-- Show Axes -->
    <div class="flex items-center justify-between">
      <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Mostra assi</label>
      <button 
        @click="$emit('update:showAxes', !showAxes)"
        :class="['w-10 h-5 rounded-full transition-colors flex items-center px-0.5', 
          showAxes ? 'bg-[hsl(var(--primary))] justify-end' : 'bg-[hsl(var(--secondary))] justify-start']"
      >
        <span class="w-4 h-4 rounded-full bg-white shadow"></span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const colorByOptions = [
  { label: 'Progetto', value: 'project' },
  { label: 'Cluster', value: 'cluster' },
  { label: 'Prezzo', value: 'amount' },
  { label: 'WBS06', value: 'wbs06' },
];

defineProps<{
  colorBy: string;
  pointSize: number;
  showPoles: boolean;
  is3D: boolean;
  showAxes: boolean;
}>();

defineEmits<{
  'update:colorBy': [value: string];
  'update:pointSize': [value: number];
  'update:showPoles': [value: boolean];
  'update:is3D': [value: boolean];
  'update:showAxes': [value: boolean];
}>();
</script>
