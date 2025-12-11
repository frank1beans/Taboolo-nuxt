<template>
  <div class="space-y-3">
    <div>
      <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Price catalog</p>
      <h1 class="text-xl font-semibold">Project price catalog {{ id }}</h1>
      <p class="text-sm text-muted-foreground">Port ElencoPrezziNew.tsx here.</p>
    </div>
    <div class="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
      TODO: replicate price table and filters from the React component.
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  alias: ["/commesse/:id/elenco-prezzi"],
});

const route = useRoute();
const id = computed(() => route.params.id);
</script>
