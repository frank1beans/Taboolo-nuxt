<script setup lang="ts">
const sections = [
  { label: 'Introduction', to: '/docs' },
  { label: 'Installation', to: '/docs/installation' },
  { label: 'Configuration', to: '/docs/configuration' },
  { label: 'Views', to: '/docs/views' },
  { label: 'Routing', to: '/docs/routing' },
  { label: 'Data Fetching', to: '/docs/data-fetching' },
  { label: 'Deployment', to: '/docs/deployment' },
];
</script>

<template>
  <nav aria-label="Docs navigation" class="space-y-6">
    <div>
      <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
        Sections
      </p>
      <ul class="space-y-0.5">
        <li v-for="section in sections" :key="section.to">
          <NuxtLink
            :to="section.to"
            class="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 [&.router-link-active]:bg-slate-100 [&.router-link-active]:text-slate-900 dark:[&.router-link-active]:bg-slate-800 dark:[&.router-link-active]:text-slate-50"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span>{{ section.label }}</span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </nav>
</template>
