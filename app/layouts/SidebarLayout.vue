<template>
  <div class="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
    <header class="bg-slate-800 text-slate-50 flex items-center gap-3 px-4 py-2 shadow">
      <div class="text-xs uppercase tracking-wide text-slate-300">Progetti e commesse</div>
      <HeaderToolbar />
    </header>
    <div class="flex flex-1 overflow-hidden">
      <aside class="w-72 bg-slate-900 text-slate-50 flex-shrink-0 flex flex-col border-r border-slate-800">
        <div class="px-4 py-3 text-sm font-semibold flex items-center justify-between">
          <span>Albero</span>
          <span class="text-xs text-slate-400">▲▼</span>
        </div>
        <div class="flex-1 overflow-y-auto">
          <SidebarMenu />
        </div>
      </aside>
      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import HeaderToolbar from '@/components/nav/HeaderToolbar.vue';
import SidebarMenu from '@/components/nav/SidebarMenu.vue';
</script>
