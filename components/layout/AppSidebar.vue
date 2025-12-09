<template>
  <aside class="hidden w-64 border-r border-border bg-sidebar-background text-sidebar-foreground md:block">
    <div class="flex items-center gap-2 px-4 py-4">
      <div class="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-semibold">
        TB
      </div>
      <div>
        <p class="text-sm font-semibold">Taboolo</p>
        <p class="text-xs text-muted-foreground">Nuxt rewrite</p>
      </div>
    </div>
    <nav class="space-y-1 px-3 py-4">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        active-class="bg-muted text-foreground"
      >
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
const navItems = [
  { label: "Home", to: "/" },
  { label: "Projects", to: "/projects" },
  { label: "Price catalog", to: "/price-catalog" },
  { label: "Budget", to: "/budget" },
];
</script>
