<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dashboard</p>
        <h1 class="text-2xl font-semibold">Welcome to the Nuxt rewrite</h1>
        <p class="text-sm text-muted-foreground">Routes and layouts ported from REACTPROJECT. Start from projects or the price catalog.</p>
      </div>
      <NuxtLink
        to="/projects"
        class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
      >
        Go to projects
      </NuxtLink>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-xl border border-border bg-card/50 p-4 shadow-sm">
        <p class="text-sm font-semibold">Projects</p>
        <p class="text-sm text-muted-foreground">List, detail and import of assets (routes /projects/...).</p>
        <NuxtLink class="mt-2 inline-flex text-sm font-semibold text-primary" to="/projects">Open</NuxtLink>
      </div>
      <div class="rounded-xl border border-border bg-card/50 p-4 shadow-sm">
        <p class="text-sm font-semibold">Price catalog</p>
        <p class="text-sm text-muted-foreground">Global explorer (/price-catalog) ready for the PriceCatalogExplorerNew migration.</p>
        <NuxtLink class="mt-2 inline-flex text-sm font-semibold text-primary" to="/price-catalog">Open</NuxtLink>
      </div>
      <div class="rounded-xl border border-border bg-card/50 p-4 shadow-sm">
        <p class="text-sm font-semibold">Unified import</p>
        <p class="text-sm text-muted-foreground">Entry point for UnifiedImport on a single project.</p>
        <NuxtLink class="mt-2 inline-flex text-sm font-semibold text-primary" to="/projects/1/import">Demo</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
});
</script>
