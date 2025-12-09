<template>
  <div class="space-y-3">
    <div>
      <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Estimate</p>
      <h1 class="text-xl font-semibold">Estimate ID {{ computoId }}</h1>
      <p class="text-sm text-muted-foreground">Placeholder for PreventivoNew.tsx.</p>
    </div>
    <div class="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
      TODO: estimate detail and BoQ matching.
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  alias: ["/commesse/:id/preventivo/:computoId"],
});

const route = useRoute();
const id = computed(() => route.params.id);
const computoId = computed(() => route.params.computoId);
</script>
