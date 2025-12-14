<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useEstimateGridConfig, type EstimateItem } from '~/composables/estimates/useEstimateGridConfig';
import { ref, computed, watch } from 'vue';

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

const { gridConfig } = useEstimateGridConfig(rowData);

// Live Subtotal Logic
const totalAmount = ref(0);
const gridApiRef = ref<any>(null);

// Calculate total from raw data (used initially and as fallback)
const calculateFromData = () => {
  let sum = 0;
  for (const item of rowData.value) {
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
watch(rowData, () => {
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
</script>

<template>
  <div class="space-y-4">
    <UCard class="border-white/10 bg-white/5">
      <template #header>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide font-medium" :class="colorMode.value === 'dark' ? 'text-slate-400' : 'text-slate-500'">
              Voci Preventivo
            </p>
            <h1 class="text-lg font-semibold" :class="colorMode.value === 'dark' ? 'text-slate-100' : 'text-slate-900'">
              {{ estimate?.name || 'Dettaglio Preventivo' }}
            </h1>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <UBadge v-if="rowData.length > 0" color="neutral" variant="soft">
              <Icon name="heroicons:list-bullet" class="w-3.5 h-3.5 mr-1" />
              {{ rowData.length }} {{ rowData.length === 1 ? 'voce' : 'voci' }}
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
        :row-data="rowData"
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
</template>


