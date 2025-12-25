<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Project } from '~/types/project';
import DataGridActions from '~/components/data-grid/DataGridActions.vue';
import StatusBadgeRenderer from '~/components/data-grid/StatusBadgeRenderer.vue';
import { useProjectCrud } from '~/composables/useProjectCrud';
import { useProjectForm } from '~/composables/useProjectForm';
import ProjectFormModal from '~/components/projects/ProjectFormModal.vue';
import { useCurrentContext } from '~/composables/useCurrentContext';
import { useProjectGridConfig } from '~/composables/projects/useProjectGridConfig';
import DataGridPage from '~/components/layout/DataGridPage.vue';
import PageToolbar from '~/components/layout/PageToolbar.vue';

definePageMeta({});
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

// Grid Config composable
const { gridConfig } = useProjectGridConfig(rowData);

// Add row highlighting for last active project
gridConfig.rowClassRules = {
  'font-bold bg-[hsl(var(--primary)/0.05)]': (params: { data?: Project }) =>
    !!params.data && params.data.id === lastActiveProjectId.value,
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

const activeCount = computed(() => rowData.value.filter(p => p.status === 'in_progress').length);
const setupCount = computed(() => rowData.value.filter(p => p.status === 'setup').length);

const contextExtras = computed(() => ({
  rowActions: {
    open: handleRowClick,
    edit: openEditModal,
    remove: deleteProject,
  },
}));

// Toolbar State
const searchText = ref('');
const gridPageRef = ref<any>(null); // Ref to DataGridPage to update grid? 
// Actually DataGridPage wraps DataGrid. We can access DataGrid via DataGridPage if we put a ref on it?
// Or we can just bind prop filterText to DataGridPage and pass it down.
// DataGridPage passes attrs to DataGrid. So if we pass :filter-text to DataGridPage, it should fall through to DataGrid.

const dataGridRef = ref<any>(null); // We need this to call export/columns if not available via wrapper
// Assuming DataGridPage passes through or we can access via chain.
// Actually DataGridPage slot `pre-grid` is inside.
// Wait, DataGridPage doesn't expose the inner DataGrid ref.
// But we pass export-filename prop.
// To handle "Reset", we just clear searchText.
// To handle "Filtra", we just assume typing filters (it's quick filter).
// To handle "Export", we need access to grid API.
// DataGridPage emits `grid-ready`. We can capture API there.

const gridApi = ref<any>(null);
const onGridReady = (params: any) => {
  gridApi.value = params.api;
};

const handleExport = () => {
  gridApi.value?.exportDataAsExcel({ fileName: 'progetti-commesse' });
};

// Reset: Clear filter text
const handleReset = () => {
  searchText.value = '';
  gridApi.value?.setFilterModel(null); // Clear other filters too?
};
</script>

<template>
  <div class="h-full flex flex-col">
    <DataGridPage
      title="Progetti"
      :grid-config="gridConfig"
      :row-data="rowData"
      :loading="loading"
      row-selection="single"
      
      :show-toolbar="false"
      :filter-text="searchText"

      empty-state-title="Nessun progetto trovato"
      empty-state-message="Non ci sono progetti da visualizzare. Crea il tuo primo progetto per iniziare."
      :custom-components="{ actionsRenderer: DataGridActions, statusBadgeRenderer: StatusBadgeRenderer }"
      :context-extras="contextExtras"
      @row-dblclick="handleRowDoubleClick"
      @grid-ready="onGridReady"
    >
      <template #header-meta>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
            {{ rowData.length }} progetti
          </span>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {{ activeCount }} attivi
          </span>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            {{ setupCount }} in setup
          </span>
        </div>
      </template>

      <!-- Unified Toolbar: Search left, ALL actions right -->
      <template #pre-grid>
        <PageToolbar
          v-model="searchText"
          search-placeholder="Filtra per codice, nome, descrizione, BU..."
        >
          <template #right>
            <!-- Reset (only when filtering) -->
            <button
              v-if="searchText"
              class="flex items-center justify-center h-9 px-4 rounded-full text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
              @click="handleReset"
            >
              <Icon name="heroicons:arrow-path" class="w-4 h-4 mr-2" />
              Reset
            </button>

            <!-- Export -->
            <UButton color="neutral" variant="outline" size="sm" icon="i-heroicons-arrow-down-tray" @click="handleExport">
              Esporta
            </UButton>

            <!-- Primary Action -->
            <UButton color="primary" size="sm" icon="i-heroicons-plus" @click="openCreateModal">
              Nuovo progetto
            </UButton>
          </template>
        </PageToolbar>
      </template>
    </DataGridPage>

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
