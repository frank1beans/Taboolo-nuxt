<template>
  <div class="space-y-3">
    <div>
      <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Analysis</p>
      <h1 class="text-xl font-semibold">Round {{ roundParam }}</h1>
      <p class="text-sm text-muted-foreground">Alias of CommessaAnalysisPage.tsx for a specific round.</p>
    </div>
    <div class="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
      TODO: filter charts by selected round.
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  alias: ["/commesse/:id/analisi/round/:roundParam"],
});

const route = useRoute();
const roundParam = computed(() => route.params.roundParam);
</script>
