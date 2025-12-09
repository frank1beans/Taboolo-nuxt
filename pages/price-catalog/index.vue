<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Price catalog</p>
        <h1 class="text-xl font-semibold">Global price catalog</h1>
        <p class="text-sm text-muted-foreground">Port PriceCatalogExplorerNew.tsx here.</p>
      </div>
      <span class="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Work in progress</span>
    </div>
    <div class="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
      TODO: semantic search plus filters by project and business unit.
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  alias: ["/elenco-prezzi"],
});
</script>
