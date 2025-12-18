<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { DataGridConfig } from '~/types/data-grid';
import type { Project } from '~/types/project';
import DataGridActions from '~/components/data-grid/DataGridActions.vue';
import StatusBadgeRenderer from '~/components/data-grid/StatusBadgeRenderer.vue';
import { useProjectCrud } from '~/composables/useProjectCrud';
import { useProjectForm } from '~/composables/useProjectForm';
import ProjectFormModal from '~/components/projects/ProjectFormModal.vue';
import { useCurrentContext } from '~/composables/useCurrentContext';

definePageMeta({
  breadcrumb: 'Progetti'
});

// Use projects composable
const { loading, fetchProjects } = useProjects();
const router = useRouter();
const colorMode = useColorMode();
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

import { useProjectGridConfig } from '~/composables/projects/useProjectGridConfig';

// ... (imports)

// Grid Config composable
const { gridConfig } = useProjectGridConfig(rowData);

// Add row highlighting for last active project
gridConfig.rowClassRules = {
  'font-bold bg-[hsl(var(--primary)/0.05)]': (params: any) => params.data && params.data.id === lastActiveProjectId.value,
};

const loadProjects = async () => {
  const data = await reloadProjectsApi(defaultFetchParams);
  rowData.value = data;
};

// Load initial data
onMounted(async () => {
  try {
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

// Row double click handler - open project detail
const handleRowDoubleClick = (row: Project) => {
  clearRowClickTimeout();
  // Same behavior as single click (navigate)
  handleRowClick(row);
};

onBeforeUnmount(() => {
  clearRowClickTimeout();
});

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

const contextExtras = computed(() => ({
  rowActions: {
    open: handleRowClick,
    edit: openEditModal,
    remove: deleteProject,
  },
}));
</script>

<template>

  <div class="h-full flex flex-col overflow-hidden space-y-4">
    <UCard class="flex-1 min-h-0 flex flex-col border-[hsl(var(--border))] bg-[hsl(var(--card))]" :ui="{ body: { base: 'flex-1 min-h-0 flex flex-col' } }">
      <template #header>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
          <div>
            <p class="text-xs uppercase tracking-wide font-medium text-[hsl(var(--muted-foreground))]">
              Progetti e commesse
            </p>
            <h1 class="text-lg font-semibold text-[hsl(var(--foreground))]">
              Elenco
            </h1>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UBadge v-if="rowData.length > 0" color="neutral" variant="soft">
              <Icon name="heroicons:folder" class="w-3.5 h-3.5 mr-1" />
              {{ rowData.length }} {{ rowData.length === 1 ? 'progetto' : 'progetti' }}
            </UBadge>
            <UButton color="primary" size="sm" icon="i-heroicons-plus" class="interactive-touch" @click="openCreateModal">
              Nuovo progetto
            </UButton>
          </div>
        </div>
      </template>

      <!-- DataGrid Component -->
      <DataGrid
        class="h-full"
        :config="gridConfig"
        :row-data="rowData"
        :loading="loading"
        row-selection="single"
        toolbar-placeholder="Filtra per codice, nome, descrizione, BU..."
        export-filename="progetti-commesse"
        empty-state-title="Nessun progetto trovato"
        empty-state-message="Non ci sono progetti da visualizzare. Crea il tuo primo progetto per iniziare."
        @row-dblclick="handleRowDoubleClick"
        :custom-components="{ actionsRenderer: DataGridActions, statusBadgeRenderer: StatusBadgeRenderer }"
        :context-extras="contextExtras"
      />
    </UCard>

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
