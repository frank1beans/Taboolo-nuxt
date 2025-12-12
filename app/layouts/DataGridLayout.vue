<template>
  <div class="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
    <!-- Top Header -->
    <header class="bg-slate-800 text-slate-50 flex items-center gap-3 px-4 py-2 shadow z-10">
      <div class="flex items-center gap-3 flex-1">
        <NuxtLink to="/" class="text-xs uppercase tracking-wide text-slate-300 hover:text-white transition">
          {{ headerTitle }}
        </NuxtLink>
        <slot name="header-actions" />
      </div>
      <slot name="header-right" />
    </header>

    <!-- Main Layout with Sidebar -->
    <div class="flex flex-1 overflow-hidden">
      <!-- WBS Sidebar (optional, controlled by enableWbsSidebar prop) -->
      <WbsSidebar
        v-if="enableWbsSidebar"
        v-model:visible="sidebarVisible"
        :project-id="projectId"
        :show-level="showWbsLevels"
        @node-selected="handleWbsNodeSelected"
      />

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col overflow-hidden">
        <!-- Page Header -->
        <div v-if="$slots['page-header']" class="bg-white border-b border-slate-200 px-4 py-3">
          <slot name="page-header" />
        </div>

        <!-- Page Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import WbsSidebar from '~/components/wbs/WbsSidebar.vue';
import type { WbsNode } from '~/types/wbs';

const props = withDefaults(
  defineProps<{
    headerTitle?: string;
    enableWbsSidebar?: boolean;
    projectId?: string;
    showWbsLevels?: boolean;
    sidebarDefaultVisible?: boolean;
  }>(),
  {
    headerTitle: 'Progetti e commesse',
    enableWbsSidebar: false,
    projectId: undefined,
    showWbsLevels: false,
    sidebarDefaultVisible: false,
  }
);

const emit = defineEmits<{
  'wbs-node-selected': [node: WbsNode | null];
}>();

const sidebarVisible = ref(props.sidebarDefaultVisible);

const handleWbsNodeSelected = (node: WbsNode | null) => {
  emit('wbs-node-selected', node);
};
</script>
