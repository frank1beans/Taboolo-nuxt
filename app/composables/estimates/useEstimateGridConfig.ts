import type { Ref } from 'vue';
import type { DataGridConfig } from '~/types/data-grid';

export interface EstimateItem {
    _id: string;
    code: string;
    progressive?: number;
    description: string;
    unit_measure: string;
    group_ids?: string[];
    wbs_hierarchy?: {
        wbs01?: string;
        wbs02?: string;
        wbs03?: string;
        wbs04?: string;
        wbs05?: string;
        wbs06?: string;
        wbs07?: string;
        [key: string]: string | undefined;
    };
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
        return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    };

    const gridConfig: DataGridConfig = {
        columns: [
            {
                field: 'progressive',
                headerName: 'Prog.',
                width: 90,
                pinned: 'left',
                cellClass: 'ag-right-aligned-cell font-mono',
                filter: 'agNumberColumnFilter',
            },
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
                filter: 'number',
            },
            {
                field: 'project.unit_price',
                headerName: 'Prezzo Unitario',
                width: 140,
                cellClass: 'ag-right-aligned-cell',
                valueFormatter: (params: any) => formatCurrency(params.value),
                filter: 'number',
            },
            {
                field: 'project.amount',
                headerName: 'Importo',
                width: 140,
                cellClass: 'ag-right-aligned-cell font-bold',
                valueFormatter: (params: any) => formatCurrency(params.value),
                filter: 'number',
            },
            // WBS Hierarchy Columns (wbs01-wbs07) - Moved to end
            {
                field: 'wbs_hierarchy.wbs01',
                headerName: 'WBS 01',
                width: 150,
                hide: true,
            },
            {
                field: 'wbs_hierarchy.wbs02',
                headerName: 'WBS 02',
                width: 150,
                hide: true,
            },
            {
                field: 'wbs_hierarchy.wbs03',
                headerName: 'WBS 03',
                width: 150,
                hide: true,
            },
            {
                field: 'wbs_hierarchy.wbs04',
                headerName: 'WBS 04',
                width: 150,
                hide: true,
            },
            {
                field: 'wbs_hierarchy.wbs05',
                headerName: 'WBS 05',
                width: 150,
                hide: true,
            },
            {
                field: 'wbs_hierarchy.wbs06',
                headerName: 'WBS 06',
                width: 150,
                hide: true,
            },
            {
                field: 'wbs_hierarchy.wbs07',
                headerName: 'WBS 07',
                width: 150,
                hide: true,
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
