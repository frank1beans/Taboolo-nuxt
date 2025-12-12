<template>
  <div class="animate-pulse h-full min-h-[400px] flex flex-col">
    <!-- Header skeleton -->
    <div class="border-b border-slate-200 bg-slate-50 px-5 py-3 flex gap-3">
      <div class="flex-1 h-9 bg-slate-200 rounded"></div>
      <div class="h-9 w-24 bg-slate-200 rounded"></div>
      <div class="h-9 w-24 bg-slate-200 rounded"></div>
    </div>

    <!-- Grid skeleton -->
    <div class="flex-1 p-4 space-y-3">
      <div v-for="i in rows" :key="i" class="flex gap-4">
        <div class="flex-1 h-8 bg-slate-100 rounded"></div>
        <div class="flex-[2] h-8 bg-slate-100 rounded"></div>
        <div class="flex-1 h-8 bg-slate-100 rounded"></div>
        <div class="flex-1 h-8 bg-slate-100 rounded"></div>
      </div>
    </div>

    <!-- Footer skeleton -->
    <div class="border-t border-slate-200 bg-white px-3 py-2">
      <div class="h-4 w-32 bg-slate-200 rounded mb-2"></div>
      <div class="h-6 w-48 bg-slate-200 rounded"></div>
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
