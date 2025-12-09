<template>
  <div class="space-y-3">
    <div>
      <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Estimate</p>
      <h1 class="text-xl font-semibold">Project estimate {{ id }}</h1>
      <p class="text-sm text-muted-foreground">Placeholder for CommessaPreventivoPage.tsx.</p>
    </div>
    <div class="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
      TODO: bring in grids and calculations from the React estimate page.
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  alias: ["/commesse/:id/preventivo"],
});

const route = useRoute();
const id = computed(() => route.params.id);
</script>
