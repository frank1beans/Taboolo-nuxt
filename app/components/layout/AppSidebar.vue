<script setup lang="ts">
import { computed, resolveDynamicComponent } from 'vue';
import { useRoute } from 'vue-router';
import { useUiStore } from '~/stores/ui';

const route = useRoute();
const uiStore = useUiStore();

const navItems = [
  { label: 'Dashboard', icon: 'i-heroicons-home', to: '/' },
  { label: 'Progetti', icon: 'i-heroicons-briefcase', to: '/projects' },
  { label: 'Elenco prezzi', icon: 'i-heroicons-list-bullet', to: '/price-catalog' },
  { label: 'Budget', icon: 'i-heroicons-banknotes', to: '/budget' },
  { label: 'Gare', icon: 'i-heroicons-flag', to: '/bids' },
  { label: 'Lab', icon: 'i-heroicons-beaker', to: '/lab' },
  { label: 'Profilo', icon: 'i-heroicons-user-circle', to: '/profile' },
];

const isActive = (path: string) => route.path === path;

const projectStatusSummary = computed(() => {
  const component = resolveDynamicComponent('ProjectStatusSummary');
  return typeof component === 'string' ? null : component;
});
</script>

<template>
  <!-- Desktop Sidebar -->
  <aside class="hidden md:flex md:w-64 md:flex-col border-r border-border bg-card text-card-foreground">
    <div class="flex h-full flex-col gap-6 px-4 py-6">
      <div class="flex items-center gap-3 px-2">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <span class="text-xl font-bold">T</span>
        </div>
        <div>
          <p class="text-sm font-bold">Taboolo</p>
          <p class="text-xs text-muted-foreground">Enterprise Suite</p>
        </div>
      </div>

      <nav class="space-y-1" aria-label="Main Navigation">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          :class="isActive(item.to) ? 'bg-muted text-foreground' : 'text-muted-foreground'"
        >
          <UIcon :name="item.icon" class="h-5 w-5" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <div class="mt-auto w-full space-y-4 border-t border-border pt-6" v-if="projectStatusSummary">
        <component :is="projectStatusSummary" />
      </div>
    </div>
  </aside>

  <!-- Mobile Sidebar -->
  <USlideover v-model="uiStore.isSidebarOpen" side="left" class="md:hidden">
    <div class="flex h-full flex-col gap-6 bg-background px-4 py-6">
      <div class="flex items-center justify-between px-2">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <span class="text-xl font-bold">T</span>
          </div>
          <div>
            <p class="text-sm font-bold">Taboolo</p>
            <p class="text-xs text-muted-foreground">Enterprise Suite</p>
          </div>
        </div>
        <UButton
          color="gray"
          variant="ghost"
          icon="i-heroicons-x-mark-20-solid"
          @click="uiStore.closeSidebar"
        />
      </div>

      <nav class="space-y-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          :class="isActive(item.to) ? 'bg-muted text-foreground' : 'text-muted-foreground'"
          @click="uiStore.closeSidebar"
        >
          <UIcon :name="item.icon" class="h-5 w-5" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>
    </div>
  </USlideover>
</template>
