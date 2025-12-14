import type { Ref } from 'vue';
import type { DataGridConfig } from '~/types/data-grid';

export interface EstimateItem {
    _id: string;
    code: string;
    description: string;
    unit_measure: string;
    project: {
        quantity: number;
        unit_price: number;
        amount: number;
    };
}

export const useEstimateGridConfig = (rowData: Ref<EstimateItem[]>) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR',
        }).format(value);
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('it-IT').format(value);
    };

    const gridConfig: DataGridConfig = {
        columns: [
            {
                field: 'code',
                headerName: 'Codice',
                width: 120,
                pinned: 'left',
            },
            {
                field: 'description',
                headerName: 'Descrizione',
                flex: 2,
                minWidth: 300,
            },
            {
                field: 'unit_measure',
                headerName: 'U.M.',
                width: 80,
            },
            {
                field: 'project.quantity',
                headerName: 'Q.tà',
                width: 100,
                cellClass: 'ag-right-aligned-cell',
                valueFormatter: (params: any) => formatNumber(params.value),
                filter: 'agNumberColumnFilter',
                headerComponent: null,
                suppressMenu: false,
                suppressHeaderMenuButton: false,
            },
            {
                field: 'project.unit_price',
                headerName: 'Prezzo Unitario',
                width: 140,
                cellClass: 'ag-right-aligned-cell',
                valueFormatter: (params: any) => formatCurrency(params.value),
                filter: 'agNumberColumnFilter',
                headerComponent: null,
                suppressMenu: false,
                suppressHeaderMenuButton: false,
            },
            {
                field: 'project.amount',
                headerName: 'Importo',
                width: 140,
                cellClass: 'ag-right-aligned-cell font-bold',
                valueFormatter: (params: any) => formatCurrency(params.value),
                filter: 'agNumberColumnFilter',
                headerComponent: null,
                suppressMenu: false,
                suppressHeaderMenuButton: false,
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
