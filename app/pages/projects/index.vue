<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import type { GridApi, GridReadyEvent } from 'ag-grid-community';
import type { Project } from '#types';
import { useProjects } from '~/composables/useProjects';
import { useProjectForm } from '~/composables/useProjectForm';
import ProjectFormModal from '~/components/projects/ProjectFormModal.vue';
import { useCurrentContext } from '~/composables/useCurrentContext';
import { useActionsStore } from '~/stores/actions';
import { useSelectionStore } from '~/stores/selection';
import type { Action } from '~/types/actions';
import * as XLSX from 'xlsx';
import SidebarActionsModule from '~/components/sidebar/modules/SidebarActionsModule.vue';


definePageMeta({
  title: 'Progetti',
  disableDefaultSidebar: true,
});

const router = useRouter();
const { currentProject } = useCurrentContext();
const lastActiveProjectId = ref<string | null>(null);

const fetchAllProjects = async () => {
  const pageSize = 200
  let page = 1
  let total = 0
  let all: Project[] = []

  while (true) {
    const response = await $fetch<{ data: Project[]; total: number }>('/api/projects', {
      query: {
        page,
        pageSize,
        sort: 'updated_at',
        order: 'desc',
      },
    })

    if (page === 1) total = response.total ?? 0
    all = all.concat(response.data || [])

    if (!response.data || response.data.length < pageSize) break
    if (total && all.length >= total) break
    page += 1
  }

  return { data: all, total }
}

const { data: projectsData, status: projectsStatus, refresh: refreshProjects } = await useAsyncData(
  'projects-list',
  fetchAllProjects,
)

const rowData = computed(() => (projectsData.value?.data || []) as unknown as Project[]);
const loading = computed(() => projectsStatus.value === 'pending');

const {
  createProject,
  updateProject,
  deleteProject: deleteProjectApi,
} = useProjects();

const { setCurrentProject } = useCurrentContext();
const actionsStore = useActionsStore();
const actionOwner = 'page:projects-index';
const selectionStore = useSelectionStore();
const selectedProjects = computed(() => selectionStore.getSelection('projects') as Project[]);
const selectedCount = computed(() => selectedProjects.value.length);

// Modal form state
const { showModal, formMode, form, openCreateModal, openEditModal, closeModal } = useProjectForm();

const loadProjects = async () => {
  await refreshProjects();
};

// Load initial data
onMounted(async () => {
  try {
    // Assets tree hidden by disableDefaultSidebar: true


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
  actionsStore.unregisterOwner(actionOwner);
});

// Register Sidebar Actions
usePageSidebarModule({
  id: 'actions',
  label: 'Azioni',
  icon: 'heroicons:command-line',
  component: SidebarActionsModule,
  props: {
    actionIds: [
      'project.create',
      'grid.exportExcel',
      'projects.exportSelected',
      'projects.deleteSelected',
    ],
    primaryActionIds: ['project.create'],
    selectionCount: selectedCount,
    showDisabled: false,
  },
})

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

const handleAnalytics = (row: Project) => {
  router.push(`/projects/${row.id}/analytics`);
};

const activeCount = computed(() => rowData.value.filter(p => p.status === 'in_progress').length);
const setupCount = computed(() => rowData.value.filter(p => p.status === 'setup').length);
const warningCount = computed(() => rowData.value.filter(p => !p.description || p.status === 'setup').length);

const exportSelectedProjects = () => {
  const rows = selectedProjects.value;
  if (!rows.length) return;

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Progetti');

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `progetti-selezionati_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

const deleteSelectedProjects = async () => {
  const rows = selectedProjects.value;
  if (!rows.length) return;
  const ok = window.confirm(`Eliminare ${rows.length} progetti selezionati?`);
  if (!ok) return;

  const results = await Promise.allSettled(rows.map((row) => deleteProjectApi(row.id)));
  const failed = results.filter((result) => result.status === 'rejected');
  if (failed.length) {
    console.error(`Failed to delete ${failed.length} projects`, failed);
  }
  selectionStore.clearSelection('projects');
  await loadProjects();
};

const registerAction = (action: Action) => {
  actionsStore.registerAction(action, { owner: actionOwner, overwrite: true });
};

onMounted(() => {
  registerAction({
    id: 'project.create',
    label: 'Nuovo progetto',
    description: 'Crea un nuovo progetto',
    category: 'Progetti',
    scope: 'global',
    icon: 'i-heroicons-plus',
    keywords: ['progetto', 'crea', 'nuovo'],
    handler: () => openCreateModal(),
  });

  registerAction({
    id: 'grid.exportExcel',
    label: 'Esporta in Excel',
    description: 'Esporta dati in Excel',
    category: 'Tabelle',
    scope: 'global',
    icon: 'i-heroicons-arrow-down-tray',
    keywords: ['export', 'excel', 'tabella'],
    handler: () => exportToXlsx('progetti-commesse'),
  });

  registerAction({
    id: 'projects.refresh',
    label: 'Aggiorna elenco progetti',
    description: 'Ricarica la lista dei progetti',
    category: 'Progetti',
    scope: 'global',
    icon: 'i-heroicons-arrow-path',
    keywords: ['refresh', 'aggiorna'],
    handler: () => loadProjects(),
  });

  registerAction({
    id: 'projects.exportSelected',
    label: 'Esporta selezionati',
    description: 'Esporta i progetti selezionati',
    category: 'Progetti',
    scope: 'selection',
    icon: 'i-heroicons-arrow-down-tray',
    keywords: ['export', 'selezionati'],
    isEnabled: () => selectedProjects.value.length > 0,
    disabledReason: 'Nessun progetto selezionato',
    handler: () => exportSelectedProjects(),
  });

  registerAction({
    id: 'projects.deleteSelected',
    label: 'Elimina selezionati',
    description: 'Elimina i progetti selezionati',
    category: 'Progetti',
    scope: 'selection',
    icon: 'i-heroicons-trash',
    tone: 'danger',
    keywords: ['elimina', 'selezionati'],
    isEnabled: () => selectedProjects.value.length > 0,
    disabledReason: 'Nessun progetto selezionato',
    handler: () => deleteSelectedProjects(),
  });
});

</script>

<template>
  <div class="h-full flex flex-col bg-[hsl(var(--background))]">
    <ProjectsTable
      :projects="rowData"
      :loading="loading"
      :last-active-project-id="lastActiveProjectId"
      selection-key="projects"
      @open="handleRowClick"
      @edit="openEditModal"
      @remove="deleteProject"
      @analytics="handleAnalytics"
      @grid-ready="(params: any) => handleGridReady(params)"
    >
      <template #header-meta>
        <div class="flex items-center gap-2">
          <CountBadge :value="rowData.length" label="Totali" icon="i-heroicons-folder" />
          <CountBadge :value="activeCount" label="In corso" icon="i-heroicons-play-circle" color="primary" />
          <CountBadge :value="setupCount" label="Setup" icon="i-heroicons-cog-6-tooth" />
          <CountBadge v-if="warningCount > 0" :value="warningCount" label="Attenzione" icon="i-heroicons-exclamation-triangle" color="warning" />
        </div>
      </template>

      <!-- Toolbar Actions (Moved to Sidebar) -->
      <template #toolbar-actions>
         <!-- Empty -->
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
