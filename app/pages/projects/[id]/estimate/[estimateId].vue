<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useEstimateGridConfig, type EstimateItem } from '~/composables/estimates/useEstimateGridConfig';
import { ref, computed, watch } from 'vue';
import type { WbsSidebarNode } from '~/components/wbs/WbsSidebar.vue';

const route = useRoute();
const projectId = route.params.id as string;
const estimateId = route.params.estimateId as string;
const colorMode = useColorMode();

// Fetch Estimate Details
const { data: estimate, status: estimateStatus } = await useFetch(`/api/projects/${projectId}/estimate/${estimateId}`);

// Fetch Estimate Items
const { data: items, status: itemsStatus } = await useFetch<EstimateItem[]>(`/api/projects/${projectId}/estimate/${estimateId}/items`);

const loading = computed(() => estimateStatus.value === 'pending' || itemsStatus.value === 'pending');
const rowData = computed(() => items.value || []);

// --- WBS Sidebar Logic ---
const wbsSidebarVisible = ref(true);
const selectedWbsNode = ref<WbsSidebarNode | null>(null);

// Build WBS HIERARCHICAL tree from wbs_hierarchy (wbs01-wbs07)
const wbsNodes = computed<WbsSidebarNode[]>(() => {
  // Use path-based keys to ensure uniqueness: "parent-path/current-value"
  const nodeMap = new Map<string, WbsSidebarNode>();
  
  for (const item of rowData.value as any[]) {
    const hierarchy = item.wbs_hierarchy || {};
    
    // Build the path from wbs01 to wbs07
    let pathParts: string[] = [];
    
    for (let level = 1; level <= 7; level++) {
      const key = `wbs0${level}`;
      const value = hierarchy[key];
      
      if (!value) continue; // Skip empty levels
      
      pathParts.push(value);
      const fullPath = pathParts.join('/');
      
      if (!nodeMap.has(fullPath)) {
        nodeMap.set(fullPath, {
          id: fullPath,
          code: value.length > 25 ? value.substring(0, 25) + '...' : value,
          name: value,
          level: level,
          children: [],
        });
      }
      
      // Link to parent (if we have more than one part in the path)
      if (pathParts.length > 1) {
        const parentPath = pathParts.slice(0, -1).join('/');
        const parentNode = nodeMap.get(parentPath);
        const currentNode = nodeMap.get(fullPath)!;
        
        if (parentNode && !parentNode.children!.find(c => c.id === currentNode.id)) {
          parentNode.children!.push(currentNode);
        }
      }
    }
  }
  
  // Collect root nodes (nodes with only one path segment)
  const rootNodes: WbsSidebarNode[] = [];
  for (const [path, node] of nodeMap) {
    // Root nodes have no "/" in their path (just the value itself)
    if (!path.includes('/')) {
      rootNodes.push(node);
    }
  }
  
  // Sort children recursively
  const sortChildren = (nodes: WbsSidebarNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const node of nodes) {
      if (node.children?.length) {
        sortChildren(node.children);
      }
    }
  };
  
  sortChildren(rootNodes);
  return rootNodes;
});

// Filtered row data based on WBS selection (using full path)
const filteredRowData = computed(() => {
  if (!selectedWbsNode.value) {
    return rowData.value;
  }
  
  // The node's id is the full path: "Edificio A/P00/UFF/0-APPALTO/etc"
  const selectedPath = selectedWbsNode.value.id;
  const pathSegments = selectedPath.split('/');
  
  return (rowData.value as any[]).filter(item => {
    const hierarchy = item.wbs_hierarchy || {};
    
    // Build the item's path from its wbs_hierarchy
    const itemPath: string[] = [];
    for (let level = 1; level <= 7; level++) {
      const key = `wbs0${level}`;
      const value = hierarchy[key];
      if (value) {
        itemPath.push(value);
      }
    }
    
    // The item matches if its path STARTS with the selected path
    // (i.e., selected path is a prefix of the item's full path)
    if (pathSegments.length > itemPath.length) {
      return false; // Selected path is deeper than item's path
    }
    
    for (let i = 0; i < pathSegments.length; i++) {
      if (itemPath[i] !== pathSegments[i]) {
        return false;
      }
    }
    
    return true;
  });
});

const onWbsNodeSelected = (node: WbsSidebarNode | null) => {
  selectedWbsNode.value = node;
  // Recalculate total when WBS filter changes
  if (gridApiRef.value) {
    // The grid will re-filter based on filteredRowData, then recalc
    nextTick(() => calculateFromGrid());
  }
};

const { gridConfig } = useEstimateGridConfig(filteredRowData);

// Live Subtotal Logic
const totalAmount = ref(0);
const gridApiRef = ref<any>(null);

// Calculate total from raw data (used initially and as fallback)
const calculateFromData = () => {
  let sum = 0;
  for (const item of filteredRowData.value) {
    if (item.project && typeof item.project.amount === 'number') {
      sum += item.project.amount;
    }
  }
  totalAmount.value = sum;
};

// Calculate total from grid API (used when filters are applied)
const calculateFromGrid = () => {
  if (!gridApiRef.value) {
    calculateFromData();
    return;
  }
  let sum = 0;
  gridApiRef.value.forEachNodeAfterFilter((node: any) => {
    if (node.data && node.data.project && typeof node.data.project.amount === 'number') {
      sum += node.data.project.amount;
    }
  });
  totalAmount.value = sum;
};

// Watch for rowData changes to recalculate
watch(filteredRowData, () => {
  if (gridApiRef.value) {
    calculateFromGrid();
  } else {
    calculateFromData();
  }
}, { immediate: true });

const onFilterChanged = () => {
  calculateFromGrid();
};

const onGridReady = (params: any) => {
  gridApiRef.value = params.api;
  calculateFromGrid();
};

const formattedTotal = computed(() => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(totalAmount.value);
});

const toggleWbsSidebar = () => {
  wbsSidebarVisible.value = !wbsSidebarVisible.value;
};
</script>

<template>
  <div class="flex gap-4 h-full">
    <!-- WBS Sidebar -->
    <WbsSidebar
      v-model:visible="wbsSidebarVisible"
      :nodes="wbsNodes"
      :show-level="false"
      @node-selected="onWbsNodeSelected"
    />

    <!-- Main Content -->
    <div class="flex-1 space-y-4">
      <UCard class="border-white/10 bg-white/5">
        <template #header>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
              <UButton
                v-if="!wbsSidebarVisible"
                icon="i-heroicons-funnel"
                color="neutral"
                variant="ghost"
                size="sm"
                title="Mostra filtro WBS"
                @click="toggleWbsSidebar"
              />
              <div>
                <p class="text-xs uppercase tracking-wide font-medium" :class="colorMode.value === 'dark' ? 'text-slate-400' : 'text-slate-500'">
                  Voci Preventivo
                </p>
                <h1 class="text-lg font-semibold" :class="colorMode.value === 'dark' ? 'text-slate-100' : 'text-slate-900'">
                  {{ estimate?.name || 'Dettaglio Preventivo' }}
                </h1>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <UBadge v-if="selectedWbsNode" color="primary" variant="soft" class="gap-1.5 pl-2 pr-1 py-1">
                <Icon name="heroicons:funnel-solid" class="w-3.5 h-3.5" />
                <span class="max-w-48 truncate">{{ selectedWbsNode.name }}</span>
                <UButton
                  icon="i-heroicons-x-mark"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  title="Rimuovi filtro WBS"
                  class="hover:bg-primary-600/20"
                  @click="onWbsNodeSelected(null)"
                />
              </UBadge>
              <UBadge v-if="filteredRowData.length > 0" color="neutral" variant="soft">
                <Icon name="heroicons:list-bullet" class="w-3.5 h-3.5 mr-1" />
                {{ filteredRowData.length }} {{ filteredRowData.length === 1 ? 'voce' : 'voci' }}
              </UBadge>
              <div
                :class="[
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-lg',
                  colorMode.value === 'dark'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                ]"
              >
                <Icon name="heroicons:currency-euro" class="w-5 h-5" />
                <span>Totale: {{ formattedTotal }}</span>
              </div>
            </div>
          </div>
        </template>

        <DataGrid
          :config="gridConfig"
          :row-data="filteredRowData"
          :loading="loading"
          height="calc(100vh - 240px)"
          toolbar-placeholder="Cerca voce..."
          export-filename="preventivo-items"
          empty-state-title="Nessuna voce trovata"
          empty-state-message="Questo preventivo non contiene ancora voci."
          @grid-ready="onGridReady"
          @filter-changed="onFilterChanged"
        />
      </UCard>
    </div>
  </div>
</template>
