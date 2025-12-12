<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
    <!-- Top Header -->
    <header class="bg-white border-b border-slate-200">
      <div class="max-w-6xl mx-auto px-4 py-3 space-y-3">
        <nav class="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
          <NuxtLink to="/" class="hover:text-slate-900 transition">Home</NuxtLink>
          <span>/</span>
          <NuxtLink to="/" class="hover:text-slate-900 transition">Progetti</NuxtLink>
          <span>/</span>
          <span class="text-slate-900 font-semibold">{{ projectInfo?.code || 'Caricamento...' }}</span>
        </nav>
        <PageHeader
          :title="projectInfo?.name || 'Progetto'"
          :subtitle="projectInfo?.code"
        >
          <template #meta>
            <span
              v-if="projectInfo?.business_unit"
              class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs"
            >
              {{ projectInfo.business_unit }}
            </span>
            <UBadge
              v-if="projectInfo?.status"
              :color="getStatusColor(projectInfo.status)"
              variant="soft"
              size="xs"
            >
              {{ formatStatus(projectInfo.status) }}
            </UBadge>
          </template>
          <template #actions>
            <UButton
              icon="i-heroicons-cog-6-tooth"
              color="gray"
              variant="ghost"
              size="sm"
              @click="navigateTo(`/projects/${projectId}/settings`)"
            >
              Impostazioni
            </UButton>
          </template>
        </PageHeader>
      </div>

      <!-- Navigation Tabs -->
      <nav class="border-t border-slate-200">
        <div class="max-w-6xl mx-auto px-4 flex items-center gap-2">
          <NuxtLink
            v-for="tab in tabs"
            :key="tab.path"
            :to="`/projects/${projectId}${tab.path}`"
            class="px-3 py-3 text-sm font-medium transition relative rounded-md"
            :class="isActiveTab(tab.path)
              ? 'text-slate-900 bg-slate-100'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'"
          >
            <span>{{ tab.label }}</span>
            <div
              v-if="isActiveTab(tab.path)"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-400 rounded-full"
            ></div>
          </NuxtLink>
        </div>
      </nav>
    </header>

    <!-- Main Content with WBS Sidebar -->
    <div class="flex flex-1 overflow-hidden">
      <!-- WBS Sidebar -->
      <WbsSidebar
        v-if="enableWbsSidebar"
        v-model:visible="wbsSidebarVisible"
        :project-id="projectId"
        :show-level="true"
        class="border-r border-slate-200 bg-white"
        @node-selected="handleWbsNodeSelected"
      />

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto">
        <div class="max-w-6xl mx-auto px-4 py-5">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import WbsSidebar from '~/components/wbs/WbsSidebar.vue';
import PageHeader from '~/components/layout/PageHeader.vue';
import type { WbsNode } from '~/types/wbs';

const route = useRoute();
const projectId = computed(() => route.params.id as string);

// Project info state
const projectInfo = ref<any>(null);
const wbsSidebarVisible = ref(false);
const enableWbsSidebar = computed(() => {
  // Enable WBS sidebar for specific pages
  const path = route.path;
  return path.includes('/wbs') || path.includes('/estimates') || path.includes('/analysis');
});

// Navigation tabs
const tabs = [
  { path: '', label: 'Overview', icon: '📊' },
  { path: '/wbs', label: 'WBS', icon: '🌳' },
  { path: '/estimates', label: 'Preventivi', icon: '📋' },
  { path: '/analysis', label: 'Analisi', icon: '📈' },
  { path: '/price-catalog', label: 'Catalogo Prezzi', icon: '💶' },
];

const isActiveTab = (tabPath: string) => {
  const currentPath = route.path.replace(`/projects/${projectId.value}`, '');
  if (tabPath === '') {
    return currentPath === '' || currentPath === '/';
  }
  return currentPath.startsWith(tabPath);
};

// Fetch project info
const fetchProjectInfo = async () => {
  try {
    const { fetchProject } = useProjects();
    const project = await fetchProject(projectId.value);
    if (project) {
      projectInfo.value = project;
    }
  } catch (error) {
    console.error('Error fetching project info:', error);
  }
};

// Status helpers
const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    setup: 'Setup',
    in_progress: 'In corso',
    closed: 'Chiuso',
  };
  return statusMap[status] || status;
};

const getStatusColor = (status: string): 'warning' | 'info' | 'neutral' => {
  const colorMap: Record<string, 'warning' | 'info' | 'neutral'> = {
    setup: 'warning',
    in_progress: 'info',
    closed: 'neutral',
  };
  return colorMap[status] || 'neutral';
};

// WBS node selection handler
const handleWbsNodeSelected = (node: WbsNode | null) => {
  // TODO: Apply filters based on WBS node selection
  console.log('WBS node selected:', node);
};

// Watch project ID changes
watch(projectId, () => {
  if (projectId.value) {
    fetchProjectInfo();
  }
}, { immediate: true });
</script>
