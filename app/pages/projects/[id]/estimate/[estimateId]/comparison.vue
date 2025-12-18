<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCurrentContext } from '~/composables/useCurrentContext'
import { useColorMode } from '#imports'

definePageMeta({
  breadcrumb: 'Confronto',
})

const route = useRoute()
const router = useRouter()
const projectId = route.params.id as string
const estimateId = route.params.estimateId as string
const colorMode = useColorMode()
const { setCurrentEstimate } = useCurrentContext()

await setCurrentEstimate(estimateId).catch((err) => console.error('Failed to set current estimate', err))

// Filters
const round = ref<string | null>((route.query.round as string) || null)
const company = ref<string | null>((route.query.company as string) || null)
const wbsFilter = ref<{ code: string; level: number } | null>(null)

const updateQuery = () => {
  const q: Record<string, string> = {}
  if (round.value) q.round = round.value
  if (company.value) q.company = company.value
  if (wbsFilter.value) {
    q.wbs = wbsFilter.value.code
    q.wbsLevel = String(wbsFilter.value.level)
  }
  router.replace({ query: q })
}

watch([round, company, wbsFilter], updateQuery)

const confrontoUrl = computed(() => {
  const params = new URLSearchParams()
  if (round.value) params.set('round', round.value)
  if (company.value) params.set('company', company.value)
  if (wbsFilter.value) {
    params.set('wbs', wbsFilter.value.code)
    params.set('wbsLevel', String(wbsFilter.value.level))
  }
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return `/api/projects/${projectId}/estimate/${estimateId}/comparison${suffix}`
})

// Filtered data fetch - includes all_rounds/all_imprese for complete dropdown options
const { data: confronto, status } = await useFetch<{
  voci: any[]
  imprese: { nome: string; round_number?: number; round_label?: string }[]
  rounds: { numero: number; label: string }[]
  all_rounds: { numero: number; label: string }[]
  all_imprese: { nome: string }[]
}>(confrontoUrl, { watch: [confrontoUrl], immediate: true })

// WBS data
const { data: wbsData } = await useFetch<{
  wbs6: Array<{ code?: string; description?: string; _id?: string }>
  wbs7: Array<{ code?: string; description?: string; parent_id?: string; _id?: string }>
}>(() => `/api/projects/${projectId}/estimates/${estimateId}/wbs`)

const wbsNodes = computed(() => {
  const nodes: any[] = []
  const w6 = wbsData.value?.wbs6 || []
  const w7 = wbsData.value?.wbs7 || []
  w6.forEach((n) => {
    nodes.push({
      id: n.code || n.description || 'wbs6',
      code: n.code || '',
      name: n.description || n.code || '',
      level: 6,
      children: w7
        .filter((c) => c.parent_id === (n as any)._id || c.code?.startsWith(n.code || ''))
        .map((c) => ({
          id: c.code || c.description || 'wbs7',
          code: c.code || '',
          name: c.description || c.code || '',
          level: 7,
          children: [],
        })),
    })
  })
  return nodes
})

const loading = computed(() => status.value === 'pending')
const rows = computed(() => confronto.value?.voci || [])
// Use all_* from API for complete dropdown options regardless of current filter
const imprese = computed(() => confronto.value?.all_imprese || confronto.value?.imprese || [])
const rounds = computed(() => confronto.value?.all_rounds || confronto.value?.rounds || [])

// Stats
const statVoci = computed(() => rows.value.length)
const statImporto = computed(() =>
  rows.value.reduce((sum, row) => sum + (row.importo_totale_progetto || 0), 0),
)

const formattedImporto = computed(() =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(statImporto.value),
)

// Columns builder
const fmtNumber = (v: any) => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0)
const fmtCurrency = (v: any) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(Number(v) || 0)
const fmtPercent = (v: any) => {
  const num = Number(v)
  if (Number.isNaN(num)) return ''
  return `${fmtNumber(num)}%`
}

// Color utils using CSS tokens for consistent theming
const getColorForIndex = (index: number) => {
  // Use CSS variables defined in main.css for company colors
  const companyNum = (index % 5) + 1
  return {
    bg: `hsl(var(--company-${companyNum}) / 0.08)`,
    border: `hsl(var(--company-${companyNum}) / 0.2)`,
    borderStrong: `hsl(var(--company-${companyNum}) / 0.4)`
  }
}

const baseCols = computed(() => ([
  {
    headerName: 'Dati Progetto',
    headerClass: 'text-[11px] uppercase tracking-wide text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))/0.3]',
    children: [
      { field: 'codice', headerName: 'Codice', width: 140, pinned: 'left', filter: 'agTextColumnFilter' },
      { field: 'descrizione', headerName: 'Descrizione', width: 300, pinned: 'left', filter: 'agTextColumnFilter', tooltipField: 'descrizione_estesa' },
      { field: 'um', headerName: 'UM', width: 70, filter: 'agTextColumnFilter' },
      { 
        field: 'quantita', 
        headerName: 'Q.tà', 
        width: 100, 
        type: 'numericColumn', 
        valueFormatter: ({ value }: any) => fmtNumber(value) 
      },
      { 
        field: 'prezzo_unitario_progetto', 
        headerName: 'P.U.', 
        width: 110, 
        type: 'numericColumn', 
        valueFormatter: ({ value }: any) => fmtCurrency(value),
        cellStyle: { fontWeight: '600' }
      },
      { 
        field: 'importo_totale_progetto', 
        headerName: 'Importo', 
        width: 130, 
        type: 'numericColumn', 
        valueFormatter: ({ value }: any) => fmtCurrency(value),
        cellStyle: { fontWeight: '600', borderRight: '2px solid hsl(var(--border))' }
      }
    ]
  },
  {
    headerName: 'Statistiche',
    headerClass: 'text-[11px] uppercase tracking-wide text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))/0.3]',
    children: [
      { 
        field: 'media_prezzi', 
        headerName: 'Media', 
        width: 110, 
        type: 'numericColumn', 
        valueFormatter: ({ value }: any) => value !== null ? fmtCurrency(value) : '-',
        cellStyle: (params: any) => ({ 
          backgroundColor: colorMode.value === 'dark' ? '#0f172a' : '#f8fafc',
          fontStyle: 'italic',
          color: 'hsl(var(--foreground))'
        })
      },
      { 
        field: 'minimo_prezzi', 
        headerName: 'Min', 
        width: 100, 
        type: 'numericColumn', 
        valueFormatter: ({ value }: any) => value !== null ? fmtCurrency(value) : '-',
        cellStyle: { color: colorMode.value === 'dark' ? '#22c55e' : '#16a34a', fontWeight: '500' }
      },
      { 
        field: 'massimo_prezzi', 
        headerName: 'Max', 
        width: 100, 
        type: 'numericColumn', 
        valueFormatter: ({ value }: any) => value !== null ? fmtCurrency(value) : '-',
        cellStyle: { color: colorMode.value === 'dark' ? '#ef4444' : '#dc2626', fontWeight: '500' }
      }
    ]
  }
]))

const companyCols = computed(() => {
  // We need to render styled HTML for badges/arrows, so we'll use cellRenderer if possible or just use simpler formatting if not using JSX.
  // AG Grid Vue can take a component for cellRenderer, but for formatting simple HTML/Styles, sometimes valueFormatter + cellClass/Style is enough.
  // However, for badges, we need custom HTML. We can define a tiny component or use a string template if `enableHtml` (deprecated?) or just a component.
  // For simplicity and robustness, we can use cellStyle for colors, but for content (arrows) we might need valueGetter.

  const cols: any[] = []

  imprese.value.forEach((impresa, idx) => {
    const key = impresa.nome
    const prefix = key
    const color = getColorForIndex(idx)

    const baseStyle = {
        backgroundColor: color.bg,
        borderRight: `1px solid ${color.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: '100%'
    }

    // Delta Renderer Helpers - using CSS vars for consistent theming
    const getDeltaColor = (val: number) => {
        if (val > 0) return 'hsl(var(--destructive))' // Red (worse)
        if (val < 0) return 'hsl(var(--success))' // Green (better)
        return undefined
    }
    
    // We can't put full JSX here easily without a separate component, but we can style the text color
    
    const children = [
      { 
        field: `offerte.${prefix}.quantita`, 
        headerName: `Q.tà`, 
        width: 100, 
        type: 'numericColumn', 
        valueFormatter: ({ value }: any) => value != null ? fmtNumber(value) : '-',
        cellStyle: { ...baseStyle, borderLeft: `2px solid ${color.border}` } // Start border
      },
      { 
        field: `offerte.${prefix}.delta_quantita`, 
        headerName: `Δ Q.tà`, 
        width: 100, 
        type: 'numericColumn', 
        valueFormatter: ({ value }: any) => value != null && value !== 0 ? (value > 0 ? `+${fmtNumber(value)}` : fmtNumber(value)) : '-',
        cellStyle: (params: any) => ({
             ...baseStyle,
             color: getDeltaColor(params.value),
             fontWeight: params.value !== 0 ? 'bold' : 'normal'
        })
      },
      {
        field: `offerte.${prefix}.prezzo_unitario`,
        headerName: `Prezzo`,
        width: 120,
        type: 'numericColumn',
        valueFormatter: ({ value }: any) => value != null ? fmtCurrency(value) : '-',
        cellStyle: (params: any) => {
             // Highlight min/max
             const isMin = params.data.minimo_prezzi != null && params.value != null && Math.abs(params.value - params.data.minimo_prezzi) < 0.001
             const isMax = params.data.massimo_prezzi != null && params.value != null && Math.abs(params.value - params.data.massimo_prezzi) < 0.001
             
             return {
                 ...baseStyle,
                 color: isMin ? 'hsl(var(--success))' : isMax ? 'hsl(var(--destructive))' : undefined,
                 fontWeight: isMin || isMax ? 'bold' : 'normal'
             }
        }
      },
      {
        field: `offerte.${prefix}.delta_perc`,
        headerName: `Δ% Prog.`,
        width: 110,
        type: 'numericColumn',
        valueFormatter: ({ value }: any) => value != null ? `${value > 0 ? '+' : ''}${fmtNumber(value)}%` : '-',
        cellStyle: (params: any) => ({
             ...baseStyle,
             color: getDeltaColor(params.value),
             fontWeight: params.value ? 'bold' : 'normal'
        })
      },
      {
        field: `offerte.${prefix}.delta_media`,
        headerName: `Δ% Media`,
        width: 110,
        type: 'numericColumn',
        valueFormatter: ({ value }: any) => value != null ? `${value > 0 ? '+' : ''}${fmtNumber(value)}%` : '-',
        cellStyle: (params: any) => ({
             ...baseStyle,
             color: getDeltaColor(params.value),
             fontWeight: params.value ? 'bold' : 'normal',
             borderRight: `2px solid ${color.border}` // End border thicker
        })
      },
      {
        field: `offerte.${prefix}.importo_totale`,
        headerName: `Importo`,
        width: 130,
        type: 'numericColumn',
        valueFormatter: ({ value }: any) => value != null ? fmtCurrency(value) : '-',
        cellStyle: baseStyle
      },
    ]

    cols.push({
        headerName: impresa.nome,
        headerClass: 'text-[11px] uppercase tracking-wide text-center font-bold text-[hsl(var(--foreground))] bg-[hsl(var(--muted))/0.5]',
        children
    })
  })
  return cols
})

const columns = computed(() => [...baseCols.value, ...companyCols.value])

// Simple grid config wrapper
const gridConfig = computed(() => ({
  columns: columns.value,
  defaultColDef: { sortable: true, resizable: true, floatingFilter: false, suppressHeaderMenuButton: true },
  rowHeight: 44,
  headerHeight: 40,
  groupHeaderHeight: 36,
}))

const onRoundSelect = (r: any) => { round.value = r as string | null }
const onCompanySelect = (c: any) => { company.value = c as string | null }

// WBS filter via sidebar: will emit wbs code/level
const handleWbsSelect = (payload: { code: string; level: number } | null) => {
  wbsFilter.value = payload
}

const filteredRows = computed(() => {
  if (!wbsFilter.value) return rows.value
  const { code, level } = wbsFilter.value
  if (level === 6) return rows.value.filter(r => r.wbs6_code === code)
  if (level === 7) return rows.value.filter(r => r.wbs7_code === code)
  return rows.value
})
</script>

<template>
  <div class="h-full flex gap-4 overflow-hidden">
    <div class="flex-1 min-w-0 flex flex-col">
      <UCard class="flex-1 min-h-0 flex flex-col border-[hsl(var(--border))] bg-[hsl(var(--card))]" :ui="{ body: { base: 'flex-1 min-h-0 flex flex-col' } }">
        <template #header>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
            <div>
              <p class="text-xs uppercase tracking-wide font-medium text-[hsl(var(--muted-foreground))]">
                Confronto offerte
              </p>
              <h1 class="text-lg font-semibold text-[hsl(var(--foreground))]">Round e Imprese</h1>
              <p class="text-xs text-[hsl(var(--muted-foreground))]">Delta prezzi e quantità rispetto al progetto</p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <UBadge color="neutral" variant="soft">{{ statVoci }} voci</UBadge>
              <div class="flex flex-wrap items-center gap-2">
                <USelect
                  :model-value="round || 'all'"
                  placeholder="Tutti i round"
                  :options="[{ label: 'Tutti i round', value: 'all' }, ...rounds.map(r => ({ label: r.label, value: String(r.numero) }))]"
                  size="sm"
                  @update:model-value="(v: any) => onRoundSelect(v === 'all' ? null : v)"
                />
                <USelect
                  :model-value="company || 'all'"
                  placeholder="Tutte le imprese"
                  :options="[{ label: 'Tutte le imprese', value: 'all' }, ...imprese.map(i => ({ label: i.nome, value: i.nome }))]"
                  size="sm"
                  @update:model-value="(v: any) => onCompanySelect(v === 'all' ? null : v)"
                />
              </div>
            </div>
          </div>
        </template>

        <DataGrid
          class="h-full"
          :config="gridConfig"
          :row-data="filteredRows"
          :loading="loading"
          toolbar-placeholder="Cerca voce..."
          empty-state-title="Nessuna voce"
          empty-state-message="Carica un ritorno di gara per vedere il confronto."
        />
      </UCard>
    </div>
    
    <!-- WBS Sidebar for filtering by WBS category -->
    <WbsSidebar
      :nodes="wbsNodes"
      :visible="wbsNodes.length > 0"
      @node-selected="handleWbsSelect"
    />
  </div>
</template>
