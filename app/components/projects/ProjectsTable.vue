<script setup lang="ts">
import { h, computed, resolveComponent, ref } from 'vue';
import type { Project } from '#types';
import type { DataGridConfig } from '~/types/data-grid';
import DataGridPage from '~/components/layout/DataGridPage.vue';
import StatusBadge from '~/components/ui/StatusBadge.vue';
import PageToolbar from '~/components/layout/PageToolbar.vue';
import SelectionBar from '~/components/ui/SelectionBar.vue';

type ProjectCellParams = { value?: unknown; data?: Project };
type ProjectRowNode = { data?: Project };

const props = withDefaults(defineProps<{
  projects: Project[];
  loading?: boolean;
  lastActiveProjectId?: string | null;
  selectionKey?: string;
  selectionActionIds?: string[];
}>(), {
  selectionKey: undefined,
  selectionActionIds: () => ['projects.exportSelected', 'projects.deleteSelected'],
});

const emit = defineEmits<{
  (e: 'open' | 'edit' | 'remove' | 'analytics', project: Project): void;
  (e: 'grid-ready', params: unknown): void;
}>();

const searchText = ref('');
const selectionMode = computed(() => (props.selectionKey ? 'multiple' : 'single'));

// --- Custom Actions Renderer (Inline) ---
const ProjectActionsRenderer = {
  props: ['params'],
  setup(props: { params: { data?: Project } }) {
    const UButton = resolveComponent('UButton');
    const UTooltip = resolveComponent('UTooltip');
    
    return () => {
      const row = props.params.data;
      if (!row) return null;

      const btnBaseClass = "transition-colors focus:opacity-100";

      // Open (Always visible or primary)
      const openBtn = h(UTooltip, { text: 'Apri progetto' }, {
        default: () => h(UButton, {
          color: 'primary',
          variant: 'ghost',
          icon: 'i-heroicons-arrow-right-circle',
          size: 'xs',
          class: "text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/30",
          onClick: (e: Event) => { e.stopPropagation(); emit('open', row); }
        })
      });

      // Analytics
      const analyticsBtn = h(UTooltip, { text: 'Vai ad analytics' }, {
        default: () => h(UButton, {
          color: 'neutral',
          variant: 'ghost',
          icon: 'i-heroicons-chart-bar',
          size: 'xs',
          class: btnBaseClass + " text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--info))] hover:bg-[hsl(var(--info-light))]",
          onClick: (e: Event) => { e.stopPropagation(); emit('analytics', row); }
        })
      });

      // Edit
      const editBtn = h(UTooltip, { text: 'Modifica' }, {
        default: () => h(UButton, {
          color: 'neutral',
          variant: 'ghost',
          icon: 'i-heroicons-pencil-square',
          size: 'xs',
          class: btnBaseClass + " text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]",
          onClick: (e: Event) => { e.stopPropagation(); emit('edit', row); }
        })
      });

      // Remove
      const removeBtn = h(UTooltip, { text: 'Elimina' }, {
        default: () => h(UButton, {
          color: 'neutral',
          variant: 'ghost',
          icon: 'i-heroicons-trash',
          size: 'xs',
          class: btnBaseClass + " text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive-light))]",
          onClick: (e: Event) => { e.stopPropagation(); emit('remove', row); }
        })
      });

      return h('div', { class: 'flex items-center justify-end h-full gap-1 group' }, [
        analyticsBtn,
        editBtn,
        removeBtn,
        h('div', { class: 'w-px h-4 bg-[hsl(var(--border))] mx-1' }),
        openBtn
      ]);
    };
  }
};

// --- Values Getters for Sorting/Filtering ---
const createValuesGetter = (field: keyof Project) => {
  return () => {
    const values = new Set<string>();
    props.projects.forEach((p) => {
      const val = p[field];
      if (val !== undefined && val !== null) values.add(String(val));
    });
    return Array.from(values).sort();
  };
};

// --- Formatters ---
const formatDate = (date: Date | string) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// --- Grid Config ---
const gridConfig = computed<DataGridConfig>(() => ({
  columns: [
    {
      field: 'code',
      headerName: 'Codice',
      width: 120,
      minWidth: 100,
      valuesGetter: createValuesGetter('code'),
      cellClass: 'font-mono text-sm font-medium tracking-wide text-[hsl(var(--foreground)/0.8)]',
    },
    {
      field: 'name',
      headerName: 'Nome Progetto',
      flex: 1,
      minWidth: 220,
      valuesGetter: createValuesGetter('name'),
      cellClass: 'font-semibold text-[hsl(var(--foreground))]',
      cellRenderer: (params: ProjectCellParams) => {
        return params.value ? `<div class="truncate" title="${params.value}">${params.value}</div>` : '';
      }
    },
    {
      field: 'business_unit',
      headerName: 'BU',
      width: 130,
      valuesGetter: createValuesGetter('business_unit'),
      valueFormatter: (params: ProjectCellParams) => params.value || '—',
      cellClass: (params: ProjectCellParams) => params.value 
        ? 'text-[hsl(var(--muted-foreground))] font-medium' 
        : 'text-[hsl(var(--muted-foreground)/0.5)] italic font-light',
    },
    {
      field: 'status',
      headerName: 'Stato',
      width: 140,
      cellRenderer: 'StatusBadge',
      valuesGetter: () => ['setup', 'in_progress', 'closed', 'warning'],
    },
    {
      field: 'updated_at',
      headerName: 'Ultima Modifica',
      width: 160,
      sort: 'desc',
      comparator: (_valueA: unknown, _valueB: unknown, nodeA: ProjectRowNode, nodeB: ProjectRowNode) => {
          const dateA = nodeA.data?.updated_at ? new Date(nodeA.data?.updated_at).getTime() : 0;
          const dateB = nodeB.data?.updated_at ? new Date(nodeB.data?.updated_at).getTime() : 0;
          return dateA - dateB;
      },
      cellRenderer: (params: ProjectCellParams) => {
        if (!params.value) return '';
        const created = params.data?.created_at ? formatDate(params.data?.created_at) : '?';
        const updated = formatDate(params.value);
        return `<div class="flex items-center h-full transition-opacity hover:opacity-100 opacity-85" title="Creato il: ${created}">
          <span class="text-sm font-medium">${updated}</span>
        </div>`;
      }
    },
    {
      colId: 'actions',
      headerName: 'Azioni',
      width: 160,
      fixedWidth: true,
      pinned: 'right',
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: 'ProjectActionsRenderer',
      cellClass: 'px-0 overflow-visible',
    }
  ],
  defaultColDef: {
    sortable: true,
    resizable: true,
    filter: true,
    headerClass: 'text-[hsl(var(--muted-foreground))] font-semibold text-[11px] uppercase tracking-wider',
  },
  headerHeight: 44,
  rowHeight: 52,
  enableQuickFilter: true,
  enableExport: true,
  animateRows: true,
  suppressCellFocus: true,
  rowClassRules: {
     'bg-[hsl(var(--primary)/0.04)] font-medium': (params: ProjectRowNode) => props.lastActiveProjectId && params.data && params.data.id === props.lastActiveProjectId,
     'hover:bg-[hsl(var(--muted)/0.3)] transition-colors': () => true
  }
}));

const customComponents = {
  StatusBadge: StatusBadge,
  ProjectActionsRenderer: ProjectActionsRenderer
};

const handleRowDoubleClick = (row: Project) => {
  emit('open', row);
};

const handleGridReady = (params: unknown) => {
  emit('grid-ready', params);
};

</script>

<template>
  <DataGridPage
    title="Progetti"
    :grid-config="gridConfig"
    :row-data="projects"
    :loading="loading"
    :row-selection="selectionMode"
    :selection-key="selectionKey"
    :show-toolbar="false"
    :filter-text="searchText"
    :custom-components="customComponents"
    class="projects-table-container h-full"
    @row-dblclick="handleRowDoubleClick"
    @grid-ready="handleGridReady"
  >
    <!-- Header Metrics -->
    <template #header-meta>
       <slot name="header-meta"/>
    </template>

    <!-- Toolbar Area -->
    <template #pre-grid>
      <ClientOnly>
        <Teleport to="#topbar-actions-portal">
          <PageToolbar
              v-model="searchText"
              search-placeholder="Filtra progetti (codice, nome, BU...)"
              class="!py-0"
              :show-search="true"
          >
            <template #right>
                <slot name="toolbar-actions"/>
            </template>
          </PageToolbar>
        </Teleport>
      </ClientOnly>

      <SelectionBar
        v-if="selectionKey"
        :selection-key="selectionKey"
        :action-ids="selectionActionIds"
        label-singular="Progetto"
        label-plural="Progetti"
      />
    </template>
  </DataGridPage>
</template>

<style>
.projects-table-container .ag-header {
  @apply border-b border-[hsl(var(--table-border))] bg-[hsl(var(--table-header-bg))];
}

.projects-table-container .ag-row {
  @apply border-b border-[hsl(var(--table-border)/0.5)] transition-colors duration-150;
}

.projects-table-container .ag-cell {
  @apply flex items-center;
}

.projects-table-container .ag-pinned-right-cols-container {
  @apply border-l border-[hsl(var(--table-border))] bg-[hsl(var(--card)/0.9)];
  backdrop-filter: blur(4px);
}
</style>
