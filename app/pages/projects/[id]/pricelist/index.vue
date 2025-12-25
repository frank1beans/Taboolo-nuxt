
<script setup lang="ts">
/**
 * Project Pricelist Page (Listino di Progetto)
 * 
 * formally identical to Estimate page but adapted for Price Catalog.
 * Shows WBS 06 and 07 only.
 */

import { useRoute, useRouter } from 'vue-router'
import { usePriceListGridConfig } from '~/composables/estimates/usePriceListGridConfig'
import type { ApiPriceListItem } from '~/types/api'
import type { Project } from '~/types/project'
import { ref, computed, watch } from 'vue'
import { useCurrentContext } from '~/composables/useCurrentContext'
import { useWbsTree } from '~/composables/useWbsTree'
import DataGridActions from '~/components/data-grid/DataGridActions.vue'
import DataGridPage from '~/components/layout/DataGridPage.vue'
import PageToolbar from '~/components/layout/PageToolbar.vue'

// ---------------------------------------------------------------------------
// Layout & Page Meta
// ---------------------------------------------------------------------------
definePageMeta({})

const route = useRoute()
const router = useRouter()
const projectId = route.params.id as string
const rawEstimateId = computed(() => {
  const value = route.query.estimateId
  return typeof value === 'string' && value !== 'null' && value !== 'undefined' ? value : null
})
const selectedEstimateId = ref<string | null>(rawEstimateId.value)
const colorMode = useColorMode()
const { setCurrentEstimate } = useCurrentContext()

// ---------------------------------------------------------------------------
// Project Context
// ---------------------------------------------------------------------------
const { data: projectContext, status: contextStatus } = await useFetch<Project>(
  `/api/projects/${projectId}/context`,
)

const estimates = computed(() => projectContext.value?.estimates ?? [])
const selectedEstimate = computed(() =>
  estimates.value.find((est) => est.id === activeEstimateId.value) ?? null,
)
const selectedEstimateName = computed(() => selectedEstimate.value?.name || null)

watch(
  rawEstimateId,
  (value) => {
    selectedEstimateId.value = value
  },
  { immediate: true },
)

watch(
  estimates,
  (list) => {
    if (!list.length) {
      selectedEstimateId.value = null
      return
    }

    const fallbackId = list[0]?.id
    const exists = list.some((est) => est.id === selectedEstimateId.value)

    if (!selectedEstimateId.value || !exists) {
      selectedEstimateId.value = fallbackId ?? null
      if (selectedEstimateId.value && import.meta.client) {
        router.replace({ query: { ...route.query, estimateId: selectedEstimateId.value } })
      }
    }
  },
  { immediate: true },
)

const activeEstimateId = computed(() => selectedEstimateId.value ?? undefined)

watch(
  activeEstimateId,
  (val) => {
    if (val) {
      setCurrentEstimate(val).catch((err) => console.error('Failed to set current estimate', err))
    }
  },
  { immediate: true },
)

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------
const priceListUrl = computed(() => {
  if (!activeEstimateId.value) return ''
  const base = `/api/projects/${projectId}/estimates/${activeEstimateId.value}/price-list`
  
  // Forward query params for rounds/companies
  const query = new URLSearchParams()
  if (route.query.round) query.set('round', route.query.round as string)
  if (route.query.company) query.set('company', route.query.company as string)
  
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return `${base}${suffix}`
})

const {
  data: priceCatalog,
  status: catalogStatus,
  execute: fetchPriceList,
} = await useFetch<{ items: ApiPriceListItem[] }>(priceListUrl, { 
    immediate: false,
    watch: [priceListUrl] 
})

watch(
  priceListUrl,
  (url) => {
    if (url) {
      fetchPriceList()
    }
  },
  { immediate: true },
)

const loading = computed(
  () => contextStatus.value === 'pending' || catalogStatus.value === 'pending',
)
const rowData = computed(() => priceCatalog.value?.items || [])

// ---------------------------------------------------------------------------
// Pending Offer Items Resolution
// ---------------------------------------------------------------------------
interface PendingCandidate {
  id: string
  code?: string
  description?: string
  unit?: string
}

interface PendingOfferItem {
  id: string
  description?: string
  code?: string
  quantity: number
  unit_price: number
  candidates: PendingCandidate[]
}

const pendingUrl = computed(() => {
  if (!activeEstimateId.value) return ''
  const base = `/api/projects/${projectId}/offers/pending`
  const query = new URLSearchParams()
  query.set('estimate_id', activeEstimateId.value)
  if (route.query.round) query.set('round', route.query.round as string)
  if (route.query.company) query.set('company', route.query.company as string)
  return `${base}?${query.toString()}`
})

const {
  data: pendingData,
  execute: fetchPending,
} = await useFetch<{ items: PendingOfferItem[] }>(pendingUrl, {
  immediate: false,
  watch: [pendingUrl],
})

watch(
  pendingUrl,
  (url) => {
    if (url) fetchPending()
  },
  { immediate: true },
)

const pendingItems = computed(() => pendingData.value?.items || [])
const selectedResolution = ref<Record<string, string>>({})
const resolvingId = ref<string | null>(null)

const resolvePendingItem = async (itemId: string) => {
  const pliId = selectedResolution.value[itemId]
  if (!pliId) return
  resolvingId.value = itemId
  try {
    await $fetch(`/api/projects/${projectId}/offers/items/${itemId}`, {
      method: 'PATCH',
      body: { price_list_item_id: pliId },
    })
    await Promise.all([fetchPending(), fetchPriceList()])
  } finally {
    resolvingId.value = null
  }
}

// ---------------------------------------------------------------------------
// WBS and Grid
// ---------------------------------------------------------------------------
const {
  wbsNodes,
  selectedWbsNode,
  wbsSidebarVisible,
  filteredRowData,
  onWbsNodeSelected,
} = useWbsTree(rowData, {
  getLevels: (item: ApiPriceListItem) => {
    const levels: { code: string; name?: string; level?: number }[] = []
    if (item.wbs6_code && item.wbs6_description) {
      levels.push({ code: item.wbs6_code, name: item.wbs6_description, level: 6 })
    }
    if (item.wbs7_code && item.wbs7_description) {
      levels.push({ code: item.wbs7_code, name: item.wbs7_description, level: 7 })
    }
    return levels
  },
})

const totalAmount = computed(() => {
  return filteredRowData.value.reduce((sum, item) => sum + (item.total_amount || 0), 0)
})

const formattedTotalAmount = computed(() => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(totalAmount.value)
})

const { gridConfig } = usePriceListGridConfig(filteredRowData)

const pageTitle = computed(() => 'Listino')
const pageSubtitle = computed(() => 
  selectedEstimateName.value || (activeEstimateId.value ? 'Listino Preventivo' : 'Listino di Progetto')
)

// Toolbar State
const searchText = ref('')
const gridApi = ref<any>(null)
const onGridReady = (params: any) => {
  gridApi.value = params.api
}

const handleReset = () => {
  searchText.value = ''
  onWbsNodeSelected(null)
  gridApi.value?.setFilterModel(null)
}

const handleExport = () => {
  gridApi.value?.exportDataAsExcel({ fileName: 'listino-items' })
}
</script>

<template>
  <DataGridPage
    :title="pageTitle"
    :grid-config="gridConfig"
    :row-data="filteredRowData"
    :loading="loading"
    empty-state-title="Nessuna voce trovata"
    empty-state-message="Il listino non contiene ancora voci."
    
    :show-toolbar="false"
    :filter-text="searchText"
    @grid-ready="onGridReady"
  >
    <!-- Header Meta: Context + Stats -->
    <template #header-meta>
       <div class="flex items-center gap-2">
         <!-- Context -->
         <span class="text-[hsl(var(--foreground))] font-medium">
            {{ pageSubtitle }}
         </span>
         <span class="text-[hsl(var(--border))]">|</span>
         <!-- Items Count -->
         <span class="text-[hsl(var(--muted-foreground))] flex items-center gap-2">
            <Icon name="heroicons:list-bullet" class="w-4 h-4 ml-1" />
            {{ filteredRowData.length }} voci
         </span>
         <!-- Total Amount (if > 0) -->
         <template v-if="totalAmount > 0">
           <span class="text-[hsl(var(--border))]">|</span>
           <span class="flex items-center gap-1 font-medium text-[hsl(var(--success))]">
              <Icon name="heroicons:currency-euro" class="w-4 h-4" />
              {{ formattedTotalAmount }}
           </span>
         </template>
       </div>
    </template>

    <!-- Header Actions (WBS/View Controls) -->
    <template #actions>
      <UButton
        :icon="wbsSidebarVisible ? 'i-heroicons-sidebar' : 'i-heroicons-sidebar'"
        color="neutral"
        variant="ghost"
        size="sm"
        :label="wbsSidebarVisible ? 'Nascondi WBS' : 'Mostra WBS'"
        @click="wbsSidebarVisible = !wbsSidebarVisible"
      />
    </template>

    <!-- Toolbar Slot -->
    <template #pre-grid>
        <!-- Pending Items Section (Pre-Grid Content) -->
        <div
            v-if="!activeEstimateId && !loading"
            class="py-4 px-4 mb-4 text-center text-sm text-[hsl(var(--muted-foreground))]"
        >
          Seleziona un preventivo per visualizzare il listino.
        </div>

        <div
          v-if="activeEstimateId && pendingItems.length"
          class="mb-6 border border-[hsl(var(--border))] rounded-xl p-4 bg-[hsl(var(--muted)/0.4)]"
        >
          <div class="flex items-center justify-between mb-3">
            <div>
              <p class="text-xs uppercase tracking-wide font-semibold text-[hsl(var(--muted-foreground))]">
                Voci da risolvere
              </p>
              <p class="text-sm text-[hsl(var(--muted-foreground))]">
                Seleziona il codice corretto per le descrizioni ambigue (LX).
              </p>
            </div>
            <UBadge color="warning" variant="soft">
              {{ pendingItems.length }} in attesa
            </UBadge>
          </div>
          <div class="space-y-3">
            <div
              v-for="item in pendingItems"
              :key="item.id"
              class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-xs"
            >
              <div class="flex flex-col gap-1">
                <div class="flex items-start justify-between gap-2">
                  <div class="font-medium text-[hsl(var(--foreground))]">{{ item.description || 'Senza descrizione' }}</div>
                  <div class="text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                    Qta {{ item.quantity }} · Prezzo {{ item.unit_price }}
                  </div>
                </div>
                <p class="text-xs text-[hsl(var(--muted-foreground))]">
                  Codice proposto: {{ item.code || '—' }}
                </p>
              </div>
              <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  v-model="selectedResolution[item.id]"
                  class="w-full sm:w-72 rounded-md border px-3 py-2 text-sm"
                  :class="colorMode.value === 'dark'
                    ? 'bg-[hsl(var(--muted))/0.2] border-[hsl(var(--border))] text-[hsl(var(--foreground))]'
                    : 'bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]'"
                >
                  <option value="" disabled>Seleziona codice</option>
                  <option
                    v-for="c in item.candidates"
                    :key="c.id"
                    :value="c.id"
                  >
                    {{ c.code || '—' }} — {{ c.description || 'Senza descrizione' }}{{ c.unit ? ` (${c.unit})` : '' }}
                  </option>
                </select>
                <UButton
                  color="primary"
                  :disabled="!selectedResolution[item.id]"
                  :loading="resolvingId === item.id"
                  @click="resolvePendingItem(item.id)"
                >
                  Abbina
                </UButton>
              </div>
              <p v-if="!item.candidates.length" class="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                Nessun candidato trovato: aggiungi il codice al listino o contatta l’admin.
              </p>
            </div>
          </div>
        </div>

        <!-- The Toolbar -->
        <PageToolbar
          v-model="searchText"
          search-placeholder="Cerca voce..."
        >
          <template #left>
             <UBadge v-if="selectedWbsNode" color="primary" variant="soft" class="gap-1.5 pl-2 pr-1 py-1 ml-2">
                <Icon name="heroicons:funnel-solid" class="w-3.5 h-3.5" />
                <span class="max-w-48 truncate">{{ selectedWbsNode.name }}</span>
                <UButton
                  icon="i-heroicons-x-mark"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  title="Rimuovi filtro WBS"
                  class="hover:bg-[hsl(var(--primary)/0.2)]"
                  @click="onWbsNodeSelected(null)"
                />
              </UBadge>
          </template>

          <template #right>
            <button
               v-if="searchText || selectedWbsNode"
               class="flex items-center justify-center h-9 px-4 rounded-full text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--background))] hover:text-[hsl(var(--foreground))] transition-colors"
               @click="handleReset"
            >
              <Icon name="heroicons:arrow-path" class="w-4 h-4 mr-2" />
              Reset
            </button>     

            <button
               class="btn-outline-theme"
               @click="handleExport"
            >
               Esporta
            </button>
          </template>
        </PageToolbar>
    </template>

    <template #sidebar>
      <WbsSidebar
        v-if="wbsSidebarVisible"
        :nodes="wbsNodes"
        :visible="true"
        @node-selected="onWbsNodeSelected"
      />
    </template>
  </DataGridPage>
</template>
