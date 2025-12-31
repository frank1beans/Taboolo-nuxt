<script setup lang="ts">
/**
 * ConflictStats.vue - Modular stats component
 */
defineProps<{
  alertCount: number;
  pendingCount: number;
  addendumCount: number;
}>();

const emit = defineEmits<{
  (e: 'open-pending' | 'open-addendum'): void;
}>();
</script>

<template>
  <div class="grid grid-cols-3 gap-2">
    <div class="flex flex-col items-center p-2 rounded-lg bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border)/0.3)]">
      <span class="text-xl font-bold text-[hsl(var(--foreground))]">{{ alertCount }}</span>
      <span class="text-[10px] text-[hsl(var(--muted-foreground))] uppercase">Conflitti</span>
    </div>
    <div 
      class="flex flex-col items-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-colors"
      @click="emit('open-pending')"
    >
      <span class="text-xl font-bold text-amber-500">{{ pendingCount }}</span>
      <span class="text-[10px] text-amber-600 uppercase">Sospesi</span>
    </div>
    <div 
      class="flex flex-col items-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 cursor-pointer hover:bg-blue-500/20 transition-colors"
      @click="emit('open-addendum')"
    >
      <span class="text-xl font-bold text-blue-500">{{ addendumCount }}</span>
      <span class="text-[10px] text-blue-600 uppercase">Addendum</span>
    </div>
  </div>
</template>
