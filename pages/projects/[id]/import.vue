<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Import</p>
        <h1 class="text-xl font-semibold">Unified import</h1>
        <p class="text-sm text-muted-foreground">Port of UnifiedImport for project {{ id }}</p>
      </div>
      <span class="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Work in progress</span>
    </div>

    <div class="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
      The upload wizard for rounds/returns/bills of quantities will land here. Reuse components from
      <code class="rounded bg-muted px-1 py-0.5 text-xs">REACTPROJECT/src/pages/import/UnifiedImport.tsx</code>.
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  alias: ["/commesse/:id/import-unificato", "/commesse/:id/ritorni-batch", "/commesse/:id/import"],
});

const route = useRoute();
const id = computed(() => route.params.id);
</script>
