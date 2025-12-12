<script setup lang="ts">
const tocItems = [
  { label: 'Nuxt configuration', href: '#nuxt-configuration' },
  { label: 'Runtime config', href: '#runtime-config' },
  { label: 'App configuration', href: '#app-configuration' },
];
</script>

<template>
  <div class="sticky top-24 text-xs text-slate-500">
    <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide">On this page</p>
    <ul class="space-y-1">
      <li v-for="item in tocItems" :key="item.href">
        <a
          :href="item.href"
          class="block rounded px-2 py-1 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50"
        >
          {{ item.label }}
        </a>
      </li>
    </ul>
  </div>
</template>
