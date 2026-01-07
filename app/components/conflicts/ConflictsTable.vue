<script setup lang="ts">
import { h, computed, resolveComponent } from 'vue';
import type { ApiOfferAlert, ApiOfferSummary } from '~/types/api';
import type { GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import type { DataGridConfig } from '~/types/data-grid';
import DataGrid from '~/components/data-grid/DataGrid.vue'; 
import { formatCurrency, formatNumber } from '~/lib/formatters';
import TableActionMenu, { type TableActionItem } from '~/components/data-grid/TableActionMenu.vue';

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
      let colorClass = 'text-[hsl(var(--warning))]';

      if (type === 'price_mismatch') { iconName = 'i-heroicons-currency-euro'; colorClass = 'text-[hsl(var(--warning))]'; }
      if (type === 'quantity_mismatch') { iconName = 'i-heroicons-scale'; colorClass = 'text-[hsl(var(--info))]'; }
      if (type === 'code_mismatch') { iconName = 'i-heroicons-qr-code'; colorClass = 'text-[hsl(var(--primary))]'; }
      
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
    return () => {
      const row = props.params.data;
      if (!row) return null;

      const items: TableActionItem[][] = [];
      const status = row.status || 'open';

      // Group 1: Navigate
      items.push([{
        label: 'Vai al dettaglio',
        icon: 'i-heroicons-arrow-top-right-on-square',
        click: () => emit('navigate', row)
      }]);

      const group2: TableActionItem[] = [];
      // Resolve
      if (status !== 'resolved') {
        group2.push({
          label: 'Segna come risolto',
          icon: 'i-heroicons-check-circle',
          click: () => emit('resolve', row),
          color: 'primary'
        });
      }

      // Ignore
      if (status !== 'ignored') {
        group2.push({
          label: 'Ignora',
          icon: 'i-heroicons-eye-slash',
          click: () => emit('ignore', row)
        });
      }

      // Reopen (only if not open)
      if (status !== 'open') {
         group2.push({
            label: 'Riapri',
            icon: 'i-heroicons-arrow-path',
            click: () => emit('reopen', row)
         });
      }
      
      if (group2.length) items.push(group2);

      return h(TableActionMenu, { items });
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
         const estName = (d.estimate_id ? props.estimateMap[d.estimate_id] : null) || 'N/D';
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
         const deltaColor = isNegative ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'; 
         
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
        
        let bgClass = "bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.3)]";
        if (status === 'resolved') bgClass = "bg-[hsl(var(--success-light))] text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)]";
        if (status === 'ignored') bgClass = "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]";
        
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${bgClass}">${label}</span>`;
      }
    },
    {
      colId: 'actions',
      headerName: '',
      width: 48,
      pinned: 'right',
      cellRenderer: 'ActionsRenderer',
      suppressMenu: true,
      sortable: false,
      cellClass: 'px-0 overflow-visible flex items-center justify-center',
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

const onSelectionChanged = (selectedRows: any[]) => {
  emit('selection-changed', selectedRows as ApiOfferAlert[]);
};

const emitGridReady = (params: GridReadyEvent<ApiOfferAlert>) => emit('grid-ready', params);
</script>

<template>
  <div class="flex-1 min-h-0 w-full rounded-[var(--card-radius)] overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm flex flex-col">
    <DataGrid
      :config="gridConfig"
      :row-data="alerts as any[]"
      :loading="loading"
      :custom-components="customComponents"
      row-selection="multiple"
      selection-key="conflicts"
      height="100%"
      class="flex-1 min-h-0"
      @grid-ready="emitGridReady"
      @selection-changed="onSelectionChanged"
    />
  </div>
</template>
