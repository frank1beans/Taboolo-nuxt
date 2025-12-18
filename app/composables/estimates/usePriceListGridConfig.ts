
import type { Ref } from 'vue';
import type { DataGridConfig } from '~/types/data-grid';
import type { ApiPriceListItem } from '~/types/api';

export const usePriceListGridConfig = (_rowData: Ref<ApiPriceListItem[]>) => {
    const formatCurrency = (value: number | null | undefined) => {
        if (value === null || value === undefined) return '-';
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR',
        }).format(value);
    };

    const gridConfig: DataGridConfig = {
        columns: [
            {
                field: 'id',
                headerName: 'ID',
                hide: true
            },
            {
                field: 'code',
                headerName: 'Codice',
                width: 120,
                pinned: 'left',
            },
            // WBS 6
            {
                field: 'wbs6_code',
                headerName: 'WBS 06 (Codice)',
                width: 120,
                hide: true
            },
            {
                field: 'wbs6_description',
                headerName: 'WBS 06',
                width: 150,
                hide: false
            },
            // WBS 7
            {
                field: 'wbs7_code',
                headerName: 'WBS 07 (Codice)',
                width: 120,
                hide: true
            },
            {
                field: 'wbs7_description',
                headerName: 'WBS 07',
                width: 150,
                hide: false
            },
            {
                field: 'description',
                headerName: 'Descrizione',
                flex: 2,
                minWidth: 300,
            },
            {
                field: 'unit',
                headerName: 'U.M.',
                width: 80,
            },
            {
                field: 'price',
                headerName: 'Prezzo Unit.',
                width: 130,
                cellClass: 'ag-right-aligned-cell',
                valueFormatter: (params: any) => formatCurrency(params.value),
                filter: 'agNumberColumnFilter',
            },
            {
                field: 'total_quantity',
                headerName: 'Quantità Tot.',
                width: 120,
                cellClass: 'ag-right-aligned-cell font-bold text-blue-600 dark:text-blue-400',
                valueFormatter: (params: any) => params.value ? new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(params.value) : '-',
                filter: 'agNumberColumnFilter',
            },
            {
                field: 'total_amount',
                headerName: 'Importo Tot.',
                width: 140,
                cellClass: 'ag-right-aligned-cell font-bold text-emerald-600 dark:text-emerald-400',
                valueFormatter: (params: { value: number }) => formatCurrency(params.value),
                filter: 'agNumberColumnFilter',
            },
        ],
        defaultColDef: {
            sortable: true,
            resizable: true,
            filter: true,
        },
        enableQuickFilter: true,
        enableExport: true,
        headerHeight: 48,
        rowHeight: 40,
        animateRows: true,
    };

    return {
        gridConfig,
    };
};
