<script setup lang="ts">
import { useRoute } from 'vue-router';
import { defineComponent, h, resolveComponent, computed } from 'vue';
import type { DataGridConfig } from '~/types/data-grid';

const route = useRoute();
const projectId = route.params.id as string;

const { data: context, status } = await useFetch(`/api/projects/${projectId}/context`);

const loading = computed(() => status.value === 'pending');
const project = computed(() => context.value);
const estimates = computed(() => context.value?.estimates || []);

const colorMode = useColorMode();

const gridConfig: DataGridConfig = {
  columns: [
    {
      field: 'name',
      headerName: 'Nome Preventivo',
      flex: 2,
      minWidth: 200,
    },
    {
      field: 'roundsCount',
      headerName: 'Round',
      width: 100,
      cellClass: 'ag-right-aligned-cell',
    },
    {
      field: 'companiesCount',
      headerName: 'Imprese',
      width: 100,
      cellClass: 'ag-right-aligned-cell',
    },
    {
      field: 'totalAmount',
      headerName: 'Totale',
      width: 140,
      cellClass: 'ag-right-aligned-cell font-bold',
      valueFormatter: (params: any) => {
        return new Intl.NumberFormat('it-IT', {
          style: 'currency',
          currency: 'EUR',
        }).format(params.value || 0);
      },
    },
    {
      colId: 'actions',
      headerName: '',
      width: 100,
      cellRenderer: 'actionsRenderer',
      sortable: false,
      filter: false,
    },
  ],
  defaultColDef: {
    sortable: true,
    resizable: true,
  },
  enableQuickFilter: true,
  enableExport: true,
  headerHeight: 48,
  rowHeight: 44,
};

const navigateToEstimate = (estimate: any) => {
  navigateTo(`/projects/${projectId}/estimate/${estimate.id}`);
};

// Custom Actions Renderer for this page
const ActionsRenderer = defineComponent({
  props: ['params'],
  setup(props) {
    return () => h(resolveComponent('UButton'), {
      icon: 'heroicons:eye',
      color: 'gray',
      variant: 'ghost',
      size: 'xs',
      onClick: () => navigateToEstimate(props.params.data),
    });
  },
});

const links = computed(() => [
  { label: 'Home', to: '/' },
  { label: 'Progetti', to: '/projects' },
  { label: project.value?.name || 'Dettaglio Progetto', to: route.path },
]);
</script>

<template>
  <div class="space-y-4">
    <UCard class="border-white/10 bg-white/5">
      <template #header>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide font-medium" :class="colorMode.value === 'dark' ? 'text-slate-400' : 'text-slate-500'">
              Preventivi
            </p>
            <h1 class="text-lg font-semibold" :class="colorMode.value === 'dark' ? 'text-slate-100' : 'text-slate-900'">
              {{ project?.name || 'Dettaglio Progetto' }}
            </h1>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UBadge v-if="estimates.length > 0" color="neutral" variant="soft">
              <Icon name="heroicons:document-text" class="w-3.5 h-3.5 mr-1" />
              {{ estimates.length }} {{ estimates.length === 1 ? 'preventivo' : 'preventivi' }}
            </UBadge>
          </div>
        </div>
      </template>


      <DataGrid
        :config="gridConfig"
        :row-data="estimates"
        :loading="loading"
        height="calc(100vh - 240px)"
        toolbar-placeholder="Cerca preventivo..."
        export-filename="preventivi"
        empty-state-title="Nessun preventivo"
        empty-state-message="Non ci sono preventivi associati a questo progetto."
        :custom-components="{ actionsRenderer: ActionsRenderer }"
        @row-dblclick="(params) => navigateToEstimate(params)"
      />
    </UCard>
  </div>
</template>
