<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { GridApi, GridReadyEvent } from 'ag-grid-community';
import type { Project } from '#types';
import { useProjectCrud } from '~/composables/useProjectCrud';
import { useProjectForm } from '~/composables/useProjectForm';
import ProjectFormModal from '~/components/projects/ProjectFormModal.vue';
import { useAppSidebar } from '~/composables/useAppSidebar';
import { useCurrentContext } from '~/composables/useCurrentContext';


definePageMeta({
  title: 'Progetti',
  disableDefaultSidebar: true,
});
const { loading, fetchProjects } = useProjects();
const router = useRouter();
const { currentProject } = useCurrentContext();
const lastActiveProjectId = ref<string | null>(null);

// Reactive row data
const rowData = ref<Project[]>([]);
const defaultFetchParams = { page: 1, pageSize: 100 as const };

// CRUD composable
const {
  createProject,
  updateProject,
  deleteProject: deleteProjectApi,
  reloadProjects: reloadProjectsApi,
} = useProjectCrud(fetchProjects);
const { setCurrentProject } = useCurrentContext();

// Modal form state
const { showModal, formMode, form, openCreateModal, openEditModal, closeModal } = useProjectForm();

const loadProjects = async () => {
  const data = await reloadProjectsApi(defaultFetchParams);
  rowData.value = data;
};

// Load initial data
onMounted(async () => {
  try {
    // Hide default sidebar (project tree) on list page

    // Capture last active project before clearing
    if (currentProject.value?.id) {
      lastActiveProjectId.value = currentProject.value.id;
    }
    
    // Clear project context when entering project list
    await setCurrentProject(null);
    await loadProjects();
  } catch (error) {
    console.error('Failed to load projects:', error);
  }
});

onBeforeUnmount(() => {
  clearRowClickTimeout();
});

// Debounced navigation to avoid firing alongside double-click edit
const rowClickTimeout = ref<number | null>(null);
const clearRowClickTimeout = () => {
  if (rowClickTimeout.value) {
    clearTimeout(rowClickTimeout.value);
    rowClickTimeout.value = null;
  }
};

// Row click handler - navigate to project detail
const handleRowClick = (row: Project) => {
  clearRowClickTimeout();
  rowClickTimeout.value = window.setTimeout(async () => {
    try {
      await setCurrentProject(row.id);
    } catch (error) {
      console.error('Failed to update current project context', error);
    }
    router.push(`/projects/${row.id}`);
    rowClickTimeout.value = null;
  }, 200);
};

const submitForm = async () => {
  try {
    const payload = {
      name: form.name,
      code: form.code,
      description: form.description,
      business_unit: form.business_unit,
      status: form.status,
    };

    if (formMode.value === 'create') {
      await createProject(payload);
    } else if (formMode.value === 'edit' && form.id) {
      await updateProject(form.id, payload);
    }
    closeModal();
    await loadProjects();
  } catch (error) {
    console.error('Errore nel salvataggio progetto:', error);
  }
};

const deleteProject = async (row: Project) => {
  const ok = window.confirm(`Eliminare il progetto ${row.code}?`);
  if (!ok) return;
  try {
    await deleteProjectApi(row.id);
    await loadProjects();
  } catch (error) {
    console.error('Errore nella cancellazione:', error);
  }
};

// Grid API for export
const gridApi = ref<GridApi | null>(null);
const { exportToXlsx } = useDataGridExport(gridApi);

const handleGridReady = (params: GridReadyEvent<Project>) => {
  gridApi.value = params.api;
};

const handleExport = () => {
  exportToXlsx('progetti-commesse');
};

const handleAnalytics = (row: Project) => {
  router.push(`/projects/${row.id}/analytics`);
};

const activeCount = computed(() => rowData.value.filter(p => p.status === 'in_progress').length);
const setupCount = computed(() => rowData.value.filter(p => p.status === 'setup').length);
const warningCount = computed(() => rowData.value.filter(p => !p.description || p.status === 'setup').length);

</script>

<template>
  <div class="h-full flex flex-col bg-[hsl(var(--background))]">
    <ProjectsTable
      :projects="rowData"
      :loading="loading"
      :last-active-project-id="lastActiveProjectId"
      @open="handleRowClick"
      @edit="openEditModal"
      @remove="deleteProject"
      @analytics="handleAnalytics"
      @grid-ready="(params: any) => handleGridReady(params)"
    >
      <!-- Header Metrics -->
      <template #header-meta>
        <div class="flex items-center gap-2">
          <UBadge variant="subtle" color="neutral" class="px-2 py-0.5 rounded-full ring-1 ring-[hsl(var(--border)/0.5)]">
            <Icon name="i-heroicons-folder" class="w-3.5 h-3.5 mr-1.5 text-[hsl(var(--muted-foreground))]" />
            <span class="font-semibold text-xs">{{ rowData.length }}</span>
            <span class="ml-1 text-[10px] uppercase tracking-wider opacity-60 font-bold">Totali</span>
          </UBadge>
          <UBadge variant="subtle" color="primary" class="px-2 py-0.5 rounded-full ring-1 ring-[hsl(var(--primary)/0.2)]">
             <Icon name="i-heroicons-play-circle" class="w-3.5 h-3.5 mr-1.5" />
             <span class="font-semibold text-xs">{{ activeCount }}</span>
             <span class="ml-1 text-[10px] uppercase tracking-wider opacity-60 font-bold">In corso</span>
          </UBadge>
          <UBadge variant="subtle" color="neutral" class="px-2 py-0.5 rounded-full ring-1 ring-[hsl(var(--border)/0.5)] text-slate-500">
             <Icon name="i-heroicons-cog-6-tooth" class="w-3.5 h-3.5 mr-1.5" />
             <span class="font-semibold text-xs">{{ setupCount }}</span>
             <span class="ml-1 text-[10px] uppercase tracking-wider opacity-60 font-bold">Setup</span>
          </UBadge>
          <UBadge v-if="warningCount > 0" variant="subtle" color="warning" class="px-2 py-0.5 rounded-full ring-1 ring-[hsl(var(--warning)/0.2)]">
             <Icon name="i-heroicons-exclamation-triangle" class="w-3.5 h-3.5 mr-1.5" />
             <span class="font-semibold text-xs">{{ warningCount }}</span>
             <span class="ml-1 text-[10px] uppercase tracking-wider opacity-60 font-bold">Attenzione</span>
          </UBadge>
        </div>
      </template>

      <!-- Toolbar Actions -->
      <template #toolbar-actions>
        <div class="flex items-center gap-2">
          <UButton 
            color="neutral" 
            variant="ghost" 
            size="sm" 
            icon="i-heroicons-arrow-down-tray" 
            class="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            @click="handleExport"
          >
            Esporta
          </UButton>

          <UButton 
            color="primary" 
            variant="solid"
            size="sm" 
            icon="i-heroicons-plus" 
            class="shadow-sm shadow-primary/20"
            @click="openCreateModal"
          >
            Nuovo progetto
          </UButton>
        </div>
      </template>
    </ProjectsTable>

    <ClientOnly>
      <ProjectFormModal
        v-model:open="showModal"
        v-model:form="form"
        :mode="formMode"
        @submit="submitForm"
      />
    </ClientOnly>
  </div>
</template>
