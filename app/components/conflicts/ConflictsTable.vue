<script setup lang="ts">
import { h, computed, resolveComponent } from 'vue';
import type { ApiOfferAlert, ApiOfferSummary } from '~/types/api';
import type { GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import type { DataGridConfig } from '~/types/data-grid';
import DataGrid from '~/components/data-grid/DataGrid.vue'; // Direct usage or via DataGridPage? index.vue uses MainPage, so I'll just use DataGrid here or wrap in a div.
// Wait, projects used DataGridPage. Let's start with a pure component I can embed.
import { formatCurrency, formatNumber } from '~/lib/formatters';

const props = defineProps<{
  alerts: ApiOfferAlert[];
  loading?: boolean;
  estimateMap: Record<string, string>; // id -> name
  offerMap: Record<string, ApiOfferSummary>; // id -> summary object
}>();

const emit = defineEmits<{
  (e: 'resolve' | 'ignore' | 'reopen' | 'navigate', alert: ApiOfferAlert): void;
  (e: 'selection-changed', alerts: ApiOfferAlert[]): void;
  (e: 'grid-ready', params: GridReadyEvent<ApiOfferAlert>): void;
}>();

// ... existing code ...


// --- Helpers ---
const formatAlertValue = (value: number | string | null | undefined, type?: string) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') {
    if (type === 'price_mismatch') return formatCurrency(value);
    return formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 3, fallback: '-' });
  }
  return String(value);
};

const typeLabels: Record<string, string> = {
  price_mismatch: 'Prezzo',
  quantity_mismatch: 'Quantità',
  code_mismatch: 'Codice',
  missing_baseline: 'Baseline',
  ambiguous_match: 'Ambiguo',
  addendum: 'Addendum',
};

const statusLabels: Record<string, string> = {
  open: 'Aperto',
  resolved: 'Risolto',
  ignored: 'Ignorato',
};

// --- Renderers ---

const AlertTypeRenderer = {
  props: ['params'],
  setup(props: { params: ICellRendererParams<ApiOfferAlert> }) {
    const UIcon = resolveComponent('UIcon');
    
    return () => {
      const type = String(props.params.value ?? '');
      const label = typeLabels[type] || type;
      let iconName = 'i-heroicons-exclamation-circle';
      let colorClass = 'text-yellow-500';

      if (type === 'price_mismatch') { iconName = 'i-heroicons-currency-euro'; colorClass = 'text-orange-500'; }
      if (type === 'quantity_mismatch') { iconName = 'i-heroicons-scale'; colorClass = 'text-blue-500'; }
      if (type === 'code_mismatch') { iconName = 'i-heroicons-qr-code'; colorClass = 'text-purple-500'; }
      
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UIcon, { name: iconName, class: `w-5 h-5 ${colorClass}` }),
        h('span', { class: 'font-medium text-[hsl(var(--foreground))]' }, label)
      ]);
    };
  }
};

const ActionsRenderer = {
  props: ['params'],
  setup(props: { params: ICellRendererParams<ApiOfferAlert> }) {
    const UButton = resolveComponent('UButton');
    const UTooltip = resolveComponent('UTooltip');

    return () => {
      const row = props.params.data;
      if (!row) return null;

      const actions = [];
      const status = row.status || 'open';

      // Resolve
      if (status !== 'resolved') {
        actions.push(h(UTooltip, { text: 'Segna come risolto' }, {
            default: () => h(UButton, {
              color: 'primary',
              variant: 'ghost',
              icon: 'i-heroicons-check-circle',
              size: 'xs',
              class: "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
              onClick: (e: Event) => { e.stopPropagation(); emit('resolve', row); }
            })
        }));
      }

      // Ignore
      if (status !== 'ignored') {
        actions.push(h(UTooltip, { text: 'Ignora' }, {
            default: () => h(UButton, {
              color: 'neutral',
              variant: 'ghost',
              icon: 'i-heroicons-eye-slash',
              size: 'xs',
              class: "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800",
              onClick: (e: Event) => { e.stopPropagation(); emit('ignore', row); }
            })
        }));
      }

      // Reopen (only if not open)
      if (status !== 'open') {
         actions.push(h(UTooltip, { text: 'Riapri' }, {
            default: () => h(UButton, {
              color: 'neutral',
              variant: 'ghost',
              icon: 'i-heroicons-arrow-path',
              size: 'xs',
              class: "text-blue-400 hover:text-blue-600 hover:bg-blue-50",
               onClick: (e: Event) => { e.stopPropagation(); emit('reopen', row); }
            })
        }));
      }

      // Navigate Link
      actions.push(h(UTooltip, { text: 'Vai al dettaglio' }, {
          default: () => h(UButton, {
            color: 'primary',
            variant: 'ghost',
            icon: 'i-heroicons-arrow-top-right-on-square',
            size: 'xs',
            class: "text-primary-500 hover:bg-primary-50",
             onClick: (e: Event) => { e.stopPropagation(); emit('navigate', row); }
          })
      }));

      return h('div', { class: 'flex items-center justify-end h-full gap-1' }, actions);
    };
  }
};

const gridConfig = computed<DataGridConfig>(() => ({
  columns: [
    {
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 48,
      maxWidth: 48,
      pinned: 'left',
      lockPosition: 'left',
      resizable: false,
      suppressMenu: true,
      headerName: '',
      field: '_selection'
    },
    {
      field: 'type',
      headerName: 'Alert',
      width: 140,
      cellRenderer: 'AlertTypeRenderer'
    },
    {
       colId: 'description',
       headerName: 'Descrizione & Contesto',
       flex: 2,
       minWidth: 300,
       autoHeight: true,
       cellRenderer: (params: ICellRendererParams<ApiOfferAlert>) => {
         const d = params.data;
         if (!d) return '';
         const estName = props.estimateMap[d.estimate_id] || 'N/D';
         const offer = props.offerMap[d.offer_id];
         const offerName = offer ? (offer.company_name || offer.name || 'Offer') : 'N/D';
         const code = d.code || d.baseline_code || '';
         const description = d.imported_description || d.message || '';
         
         return `
           <div class="flex flex-col py-1.5 gap-0.5 justify-center h-full text-xs leading-tight">
             ${code ? `<div class="font-mono text-[10px] text-[hsl(var(--primary))] font-semibold">${code}</div>` : ''}
             <div class="font-medium text-[hsl(var(--foreground))] text-sm line-clamp-2" title="${description}">${description}</div>
             <div class="text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 truncate">
               <span class="truncate" title="${estName}">${estName}</span>
               <span class="text-[hsl(var(--border))]">•</span>
               <span class="truncate font-medium text-[hsl(var(--foreground)/0.7)]" title="${offerName}">${offerName}</span>
             </div>
           </div>
         `;
       }
    },
    {
      colId: 'values',
      headerName: 'Valori (Attuale / Atteso / Delta)',
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (params: ICellRendererParams<ApiOfferAlert>) => {
         const d = params.data;
         if (!d) return '';
         if (d.actual === null && d.expected === null) return '';
         
         const actual = formatAlertValue(d.actual, d.type);
         const expected = formatAlertValue(d.expected, d.type);
         const delta = d.delta !== null ? formatAlertValue(d.delta, d.type) : null;
         
         const actualLabel = d.type === 'price_mismatch' ? 'Offerta' : 'Actual';
         const expectedLabel = d.type === 'price_mismatch' ? 'Listino' : 'Target';
         
         const isNegative = d.delta !== null && typeof d.delta === 'number' && d.delta < 0;
         const deltaColor = isNegative ? 'text-emerald-600' : 'text-red-500'; // Lower price is usually better/green? Depends on context. For price mismatch usually we want match.
         // If price mismatch: Actual (Offer) vs Target (Estimate). 
         // If Offer < Estimate -> Green (Savings). If Offer > Estimate -> Red (Over budget).
         // Delta = Actual - Expected. So negative delta = Savings.
         
         return `
          <div class="flex items-center h-full gap-3 text-xs">
            <div class="flex flex-col">
               <span class="text-[hsl(var(--muted-foreground))] uppercase text-[10px]">${actualLabel}</span>
               <span class="font-mono font-medium">${actual}</span>
            </div>
             <div class="w-px h-6 bg-[hsl(var(--border))]"></div>
            <div class="flex flex-col">
               <span class="text-[hsl(var(--muted-foreground))] uppercase text-[10px]">${expectedLabel}</span>
               <span class="font-mono text-[hsl(var(--muted-foreground))]">${expected}</span>
            </div>
             ${ delta ? `
               <div class="w-px h-6 bg-[hsl(var(--border))]"></div>
               <div class="flex flex-col">
                 <span class="text-[hsl(var(--muted-foreground))] uppercase text-[10px]">Delta</span>
                 <span class="font-mono font-bold ${deltaColor}">${delta}</span>
               </div>
             ` : ''}
          </div>
         `;
      }
    },
    {
      field: 'status',
      headerName: 'Stato',
      width: 120,
      cellRenderer: (params: ICellRendererParams<ApiOfferAlert>) => {
        const status = String(params.value || 'open');
        const label = statusLabels[status];
        
        let bgClass = "bg-yellow-50 text-yellow-600 border-yellow-200";
        if (status === 'resolved') bgClass = "bg-emerald-50 text-emerald-600 border-emerald-200";
        if (status === 'ignored') bgClass = "bg-gray-50 text-gray-500 border-gray-200";
        
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${bgClass}">${label}</span>`;
      }
    },
    {
      colId: 'actions',
      headerName: '',
      width: 120,
      pinned: 'right',
      cellRenderer: 'ActionsRenderer',
      suppressMenu: true,
      sortable: false
    }
  ],
  defaultColDef: {
    sortable: true,
    filter: true,
    resizable: true,
    headerClass: 'text-[hsl(var(--muted-foreground))] font-semibold text-[11px] uppercase tracking-wider',
  },
  headerHeight: 44,
  rowHeight: 60, // Taller rows for context
  rowClassRules: {
     'hover:bg-[hsl(var(--muted)/0.3)] transition-colors group/row': () => true
  }
}));

const customComponents = {
  AlertTypeRenderer,
  ActionsRenderer
};

const onSelectionChanged = (selectedRows: ApiOfferAlert[]) => {
  emit('selection-changed', selectedRows);
};

const emitGridReady = (params: GridReadyEvent<ApiOfferAlert>) => emit('grid-ready', params);
</script>

<template>
  <div class="flex-1 min-h-0 w-full rounded-xl overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm flex flex-col">
    <DataGrid
      :config="gridConfig"
      :row-data="alerts"
      :loading="loading"
      :custom-components="customComponents"
      row-selection="multiple"
      height="100%"
      class="flex-1 min-h-0"
      @grid-ready="emitGridReady"
      @selection-changed="onSelectionChanged"
    />
  </div>
</template>
