<template>
  <button
    class="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 transition text-slate-50"
    type="button"
  >
    <span>{{ icon }}</span>
    <span class="hidden md:inline">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{ icon: string; label: string }>();
</script>
