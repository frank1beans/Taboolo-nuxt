<template>
  <div class="animate-pulse h-full min-h-[400px] flex flex-col">
    <!-- Header skeleton -->
    <div class="border-b border-[hsl(var(--border))] px-5 py-3 flex gap-3 bg-[hsl(var(--secondary))]">
      <div class="flex-1 h-9 rounded-md bg-[hsl(var(--muted))]"/>
      <div class="h-9 w-24 rounded-md bg-[hsl(var(--muted))]"/>
      <div class="h-9 w-24 rounded-md bg-[hsl(var(--muted))]"/>
    </div>

    <!-- Grid skeleton -->
    <div class="flex-1 p-4 space-y-3">
      <div v-for="i in rows" :key="i" class="flex gap-4">
        <div class="flex-1 h-8 rounded-md bg-[hsl(var(--muted))]"/>
        <div class="flex-[2] h-8 rounded-md bg-[hsl(var(--muted))]"/>
        <div class="flex-1 h-8 rounded-md bg-[hsl(var(--muted))]"/>
        <div class="flex-1 h-8 rounded-md bg-[hsl(var(--muted))]"/>
      </div>
    </div>

    <!-- Footer skeleton -->
    <div class="border-t border-[hsl(var(--border))] px-3 py-2 bg-[hsl(var(--card))]">
      <div class="h-4 w-32 rounded mb-2 bg-[hsl(var(--muted))]"/>
      <div class="h-6 w-48 rounded bg-[hsl(var(--muted))]"/>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    rows?: number;
  }>(),
  {
    rows: 10,
  }
);
</script>
