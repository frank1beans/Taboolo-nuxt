import type { Ref } from 'vue'
import type { DataGridConfig } from '~/types/data-grid'
import type { SimilarItem } from '~/composables/usePriceEstimator'
import { formatCurrency, formatNumber } from '~/lib/formatters'

export const usePriceEstimatorGridConfig = (_rowData: Ref<SimilarItem[]>) => {
  const gridConfig: DataGridConfig = {
    columns: [
      {
        field: 'code',
        headerName: 'Codice',
        width: 120,
        pinned: 'left',
        cellClass: 'font-mono',
      },
      {
        field: 'description',
        headerName: 'Descrizione',
        flex: 2,
        minWidth: 320,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        valueGetter: (params: any) => {
          const data = params.data
          if (!data) return ''
          return data.extendedDescription ||
            data.extended_description ||
            data.longDescription ||
            data.long_description ||
            data.description ||
            ''
        },
      },
      {
        field: 'project_name',
        headerName: 'Progetto',
        width: 180,
      },
      {
        field: 'unit',
        headerName: 'U.M.',
        width: 80,
      },
      {
        field: 'price',
        headerName: 'Prezzo',
        width: 130,
        cellClass: 'ag-right-aligned-cell',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        valueFormatter: (params: any) => formatCurrency(params.value, { fallback: '-' }),
      },
      {
        field: 'similarity',
        headerName: 'Similarita',
        width: 110,
        cellClass: 'ag-right-aligned-cell',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        valueGetter: (params: any) => {
          const value = params.data?.similarity
          if (value === null || value === undefined) return null
          return Math.round(value * 100)
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        valueFormatter: (params: any) =>
          params.value === null || params.value === undefined ? '-' : `${formatNumber(params.value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}%`,
      },
      {
        field: 'combined_score',
        headerName: 'Score',
        width: 100,
        cellClass: 'ag-right-aligned-cell',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        valueGetter: (params: any) => {
          const value = params.data?.combined_score
          if (value === null || value === undefined) return null
          return Math.round(value * 100)
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        valueFormatter: (params: any) =>
          params.value === null || params.value === undefined ? '-' : `${formatNumber(params.value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}%`,
      },
      {
        colId: 'matches',
        headerName: 'Match',
        width: 90,
        sortable: false,
        filter: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        valueGetter: (params: any) => {
          const matches = params.data?.property_matches || []
          const matched = matches.filter((match: { is_match?: boolean }) => match.is_match).length
          return `${matched}/${matches.length}`
        },
      },
    ],
    defaultColDef: {
      sortable: true,
      resizable: true,
      filter: false,
    },
    enableQuickFilter: false,
    enableExport: false,
    headerHeight: 44,
    rowHeight: 46,
    animateRows: true,
  }

  return {
    gridConfig,
  }
}
