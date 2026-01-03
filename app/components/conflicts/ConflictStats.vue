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
      class="flex flex-col items-center p-2 rounded-lg bg-[hsl(var(--warning)/0.1)] border border-[hsl(var(--warning)/0.2)] cursor-pointer hover:bg-[hsl(var(--warning)/0.2)] transition-colors"
      @click="emit('open-pending')"
    >
      <span class="text-xl font-bold text-[hsl(var(--warning))]">{{ pendingCount }}</span>
      <span class="text-[10px] text-[hsl(var(--warning))] uppercase">Sospesi</span>
    </div>
    <div 
      class="flex flex-col items-center p-2 rounded-lg bg-[hsl(var(--info)/0.1)] border border-[hsl(var(--info)/0.2)] cursor-pointer hover:bg-[hsl(var(--info)/0.2)] transition-colors"
      @click="emit('open-addendum')"
    >
      <span class="text-xl font-bold text-[hsl(var(--info))]">{{ addendumCount }}</span>
      <span class="text-[10px] text-[hsl(var(--info))] uppercase">Addendum</span>
    </div>
  </div>
</template>
