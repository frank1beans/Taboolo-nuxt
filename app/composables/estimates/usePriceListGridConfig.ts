
import type { Ref } from 'vue';
import type { DataGridConfig } from '~/types/data-grid';
import type { ApiPriceListItem } from '~/types/api';
import { formatCurrency, formatNumber } from '~/lib/formatters';

export const usePriceListGridConfig = (_rowData: Ref<ApiPriceListItem[]>) => {
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
                filterMode: 'multi',
                hide: true
            },
            {
                field: 'wbs6_description',
                headerName: 'WBS 06',
                width: 150,
                filterMode: 'multi',
                hide: false
            },
            // WBS 7
            {
                field: 'wbs7_code',
                headerName: 'WBS 07 (Codice)',
                width: 120,
                filterMode: 'multi',
                hide: true
            },
            {
                field: 'wbs7_description',
                headerName: 'WBS 07',
                width: 150,
                filterMode: 'multi',
                hide: false
            },
            {
                field: 'description',
                headerName: 'Descrizione',
                flex: 2,
                minWidth: 300,
                // Prioritize extended > long > description
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                valueGetter: (params: any) => {
                    const data = params.data;
                    if (!data) return '';
                    return data.extendedDescription ||
                        data.extended_description ||
                        data.longDescription ||
                        data.long_description ||
                        data.description ||
                        data.item_description ||
                        '';
                },
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                valueGetter: (params: any) => {
                    return params.data?.offer_unit_price ?? params.data?.price;
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                valueFormatter: (params: any) => formatCurrency(params.value, { fallback: '-' }),
                filter: 'agNumberColumnFilter',
            },
            {
                field: 'total_quantity',
                headerName: 'Quantità Tot.',
                width: 120,
                cellClass: 'ag-right-aligned-cell font-bold text-[hsl(var(--info))]',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                valueFormatter: (params: any) =>
                    formatNumber(params.value, { minimumFractionDigits: 2, maximumFractionDigits: 2, fallback: '-' }),
                filter: 'agNumberColumnFilter',
            },
            {
                field: 'total_amount',
                headerName: 'Importo Tot.',
                width: 140,
                cellClass: 'ag-right-aligned-cell font-bold text-[hsl(var(--success))]',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                valueFormatter: (params: any) => formatCurrency(params.value, { fallback: '-' }),
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
        headerHeight: 44,
        rowHeight: 44,
        animateRows: true,
    };

    return {
        gridConfig,
    };
};
