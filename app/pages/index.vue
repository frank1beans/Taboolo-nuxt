<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { DataGridConfig } from '~/types/data-grid';
import type { Project } from '~/composables/useProjects';
import DataGridActions from '~/components/data-grid/DataGridActions.vue';

definePageMeta({ layout: 'clean' });

// Use projects composable
const { loading, fetchProjects } = useProjects();
const router = useRouter();

// Reactive row data
const rowData = ref<Project[]>([]);

// Modal form
const showModal = ref(false);
const formMode = ref<'create' | 'edit'>('create');
const form = reactive({
  id: '',
  name: '',
  code: '',
  description: '',
  business_unit: '',
  status: 'setup' as Project['status'],
});

// Format date helper
const formatDate = (date: Date | string): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Format status helper
const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    setup: 'Setup',
    in_progress: 'In corso',
    closed: 'Chiuso',
  };
  return statusMap[status] || status;
};

// Values getter for dynamic filter options
const createValuesGetter = (field: keyof Project) => {
  return () => {
    const values = new Set<string>();
    rowData.value.forEach((project) => {
      const value = project[field];
      if (value !== undefined && value !== null) {
        values.add(String(value));
      }
    });
    return Array.from(values).sort();
  };
};

// DataGrid configuration
const gridConfig: DataGridConfig = {
  columns: [
    {
      field: 'code',
      headerName: 'Codice',
      flex: 1,
      maxWidth: 200,
      minWidth: 120,
      valuesGetter: createValuesGetter('code'),
    },
    {
      field: 'name',
      headerName: 'Nome',
      flex: 2,
      minWidth: 220,
      valuesGetter: createValuesGetter('name'),
    },
    {
      field: 'business_unit',
      headerName: 'Business Unit',
      flex: 1,
      minWidth: 140,
      maxWidth: 200,
      valuesGetter: createValuesGetter('business_unit'),
    },
    {
      field: 'status',
      headerName: 'Stato',
      flex: 1,
      minWidth: 120,
      maxWidth: 150,
      valueFormatter: (params: any) => formatStatus(params.value),
      valuesGetter: () => ['setup', 'in_progress', 'closed'],
    },
    {
      field: 'created_at',
      headerName: 'Creato',
      flex: 1,
      minWidth: 130,
      maxWidth: 160,
      valueFormatter: (params: any) => formatDate(params.value),
    },
    {
      field: 'updated_at',
      headerName: 'Ultimo update',
      flex: 1,
      minWidth: 160,
      maxWidth: 180,
      valueFormatter: (params: any) => formatDate(params.value),
    },
    {
      field: 'actions',
      headerName: '',
      width: 120,
      pinned: 'right',
      filter: false,
      sortable: false,
      resizable: false,
      suppressMenu: true,
      lockPosition: 'right',
      cellRenderer: 'actionsRenderer',
    },
  ],
  enableQuickFilter: true,
  enableExport: true,
  enableColumnToggle: false,
  headerHeight: 64,
};

// Load initial data
onMounted(async () => {
  try {
    const response = await fetchProjects({
      page: 1,
      pageSize: 100, // Client-side mode: fetch all data
    });
    rowData.value = response.data;
  } catch (error) {
    console.error('Failed to load projects:', error);
  }
});

const reloadProjects = async () => {
  const response = await fetchProjects({ page: 1, pageSize: 100 });
  rowData.value = response.data;
};

// Row click handler - navigate to project detail
const handleRowClick = (row: Project) => {
  router.push(`/projects/${row.id}`);
};

// Row double click handler - open in edit mode
const handleRowDoubleClick = (row: Project) => {
  openEditModal(row);
};

const openCreateModal = () => {
  formMode.value = 'create';
  Object.assign(form, { id: '', name: '', code: '', description: '', business_unit: '', status: 'setup' });
  showModal.value = true;
};

const openEditModal = (row: Project) => {
  formMode.value = 'edit';
  Object.assign(form, {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description || '',
    business_unit: row.business_unit || '',
    status: row.status,
  });
  showModal.value = true;
};

const submitForm = async () => {
  try {
    if (formMode.value === 'create') {
      await $fetch('/api/projects', {
        method: 'POST',
        body: {
          name: form.name,
          code: form.code,
          description: form.description,
          business_unit: form.business_unit,
          status: form.status,
        },
      });
    } else if (formMode.value === 'edit' && form.id) {
      await $fetch(`/api/projects/${form.id}`, {
        method: 'PUT',
        body: {
          name: form.name,
          code: form.code,
          description: form.description,
          business_unit: form.business_unit,
          status: form.status,
        },
      });
    }
    showModal.value = false;
    await reloadProjects();
  } catch (error) {
    console.error('Errore nel salvataggio progetto:', error);
  }
};

const deleteProject = async (row: Project) => {
  const ok = window.confirm(`Eliminare il progetto ${row.code}?`);
  if (!ok) return;
  try {
    await $fetch(`/api/projects/${row.id}`, { method: 'DELETE' });
    await reloadProjects();
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
  <div class="p-4 space-y-4">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-500">Progetti e commesse</p>
            <h1 class="text-lg font-semibold text-slate-900">Elenco</h1>
          </div>
          <div class="flex items-center gap-2">
            <UBadge v-if="rowData.length > 0" color="neutral" variant="soft">
              {{ rowData.length }} progetti
            </UBadge>
            <UButton color="primary" size="sm" icon="i-heroicons-plus" @click="openCreateModal">
              Nuovo progetto
            </UButton>
          </div>
        </div>
      </template>

      <!-- DataGrid Component -->
      <DataGrid
        :config="gridConfig"
        :row-data="rowData"
        :loading="loading"
        height="660px"
        row-selection="single"
        toolbar-placeholder="Filtra per codice, nome, descrizione, BU..."
        export-filename="progetti-commesse"
        empty-state-title="Nessun progetto trovato"
        empty-state-message="Non ci sono progetti da visualizzare. Crea il tuo primo progetto per iniziare."
        @row-dblclick="handleRowDoubleClick"
        :custom-components="{ actionsRenderer: DataGridActions }"
        :context-extras="contextExtras"
      />
    </UCard>

    <UModal
      v-model:open="showModal"
      :portal="true"
      :ui="{
        overlay: 'z-[70]',
        content: 'z-[75] max-w-xl w-full',
      }"
    >
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-slate-900">
              {{ formMode === 'create' ? 'Nuovo progetto' : 'Modifica progetto' }}
            </h3>
            <UButton icon="i-heroicons-x-mark" variant="ghost" color="gray" @click="showModal = false" />
          </div>
        </template>
        <div class="space-y-3">
          <UFormField label="Codice" required>
            <UInput v-model="form.code" />
          </UFormField>
          <UFormField label="Nome" required>
            <UInput v-model="form.name" />
          </UFormField>
          <UFormField label="Descrizione">
            <UInput v-model="form.description" />
          </UFormField>
          <UFormField label="Business Unit">
            <UInput v-model="form.business_unit" />
          </UFormField>
          <UFormField label="Stato">
            <USelect
              v-model="form.status"
              :options="[
                { label: 'Setup', value: 'setup' },
                { label: 'In corso', value: 'in_progress' },
                { label: 'Chiuso', value: 'closed' },
              ]"
            />
          </UFormField>
        </div>
        <template #footer>
          <div class="flex items-center justify-end gap-2">
            <UButton variant="ghost" color="gray" @click="showModal = false">Annulla</UButton>
            <UButton color="primary" @click="submitForm">
              {{ formMode === 'create' ? 'Crea' : 'Salva' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
