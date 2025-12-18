
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
import DataGridPage from '~/components/layout/DataGridPage.vue'

// ---------------------------------------------------------------------------
// Layout & Page Meta
// ---------------------------------------------------------------------------
definePageMeta({
  breadcrumb: 'Listino',
})

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

const pageTitle = computed(() => 
  selectedEstimateName.value || (activeEstimateId.value ? 'Listino Preventivo' : 'Listino di Progetto')
)
</script>

<template>
  <DataGridPage
    :title="pageTitle"
    subtitle="Listino"
    :grid-config="gridConfig"
    :row-data="filteredRowData"
    :loading="loading"
    toolbar-placeholder="Cerca voce..."
    export-filename="listino-items"
    empty-state-title="Nessuna voce trovata"
    empty-state-message="Il listino non contiene ancora voci."
  >
    <!-- ACTIONS -->
    <template #actions>
      <UButton
        :icon="wbsSidebarVisible ? 'i-heroicons-sidebar' : 'i-heroicons-sidebar'"
        color="neutral"
        variant="ghost"
        size="sm"
        label="WBS"
        :title="wbsSidebarVisible ? 'Nascondi WBS' : 'Mostra WBS'"
        @click="wbsSidebarVisible = !wbsSidebarVisible"
      />
      <UBadge v-if="selectedWbsNode" color="primary" variant="soft" class="gap-1.5 pl-2 pr-1 py-1">
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
      <UBadge v-if="filteredRowData.length > 0" color="neutral" variant="soft">
        <Icon name="heroicons:list-bullet" class="w-3.5 h-3.5 mr-1" />
        {{ filteredRowData.length }} voci
      </UBadge>
      <!-- Grand Total -->
      <div
        v-if="totalAmount > 0"
        :class="[
          'flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-lg',
          colorMode.value === 'dark'
            ? 'bg-[hsl(var(--success)/0.2)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.3)]'
            : 'bg-[hsl(var(--success-light))] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.2)]'
        ]"
      >
        <Icon name="heroicons:currency-euro" class="w-5 h-5" />
        <span>Totale: {{ formattedTotalAmount }}</span>
      </div>
    </template>

    <!-- PRE-GRID (Pending Items) -->
    <template #pre-grid>
        <div
            v-if="!activeEstimateId && !loading"
            class="py-10 text-center text-sm text-[hsl(var(--muted-foreground))]"
        >
          Seleziona un preventivo per visualizzare il listino.
        </div>

        <div
          v-if="activeEstimateId && pendingItems.length"
          class="mb-4 border border-[hsl(var(--border))] rounded-lg p-4 bg-[hsl(var(--muted)/0.4)]"
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
              class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3"
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
                    : 'bg-white border-[hsl(var(--border))] text-[hsl(var(--foreground))]'"
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
    </template>

    <!-- SIDEBAR -->
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
