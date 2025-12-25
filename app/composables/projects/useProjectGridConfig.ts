import type { Ref } from 'vue'
import type { DataGridConfig } from '~/types/data-grid'
import type { Project } from '~/composables/useProjects'

export const useProjectGridConfig = (rowData: Ref<Project[]>) => {
    const formatDate = (date: Date | string): string => {
        if (!date) return ''
        const d = new Date(date)
        return d.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })
    }

    const formatStatus = (status: string): string => {
        const statusMap: Record<string, string> = {
            setup: 'Setup',
            in_progress: 'In corso',
            closed: 'Chiuso',
        }
        return statusMap[status] || status
    }

    const createValuesGetter = (field: keyof Project) => {
        return () => {
            const values = new Set<string>()
            rowData.value.forEach((project) => {
                const value = project[field]
                if (value !== undefined && value !== null) {
                    values.add(String(value))
                }
            })
            return Array.from(values).sort()
        }
    }

    const gridConfig: DataGridConfig = {
        columns: [
            {
                field: 'code',
                headerName: 'Codice',
                flex: 1,
                maxWidth: 200,
                minWidth: 120,
                valuesGetter: createValuesGetter('code'),
                cellClass: 'text-[hsl(var(--muted-foreground))] font-mono text-sm tracking-wide',
            },
            {
                field: 'name',
                headerName: 'Nome',
                flex: 2,
                minWidth: 220,
                valuesGetter: createValuesGetter('name'),
                cellClass: 'font-semibold text-[hsl(var(--foreground))] text-[0.95rem]',
            },
            {
                field: 'business_unit',
                headerName: 'Business Unit',
                flex: 1,
                minWidth: 140,
                maxWidth: 200,
                valuesGetter: createValuesGetter('business_unit'),
                cellClass: 'text-[hsl(var(--muted-foreground))] text-sm',
            },
            {
                field: 'status',
                headerName: 'Stato',
                flex: 1,
                minWidth: 120,
                maxWidth: 150,
                cellRenderer: 'statusBadgeRenderer',
                valuesGetter: () => ['setup', 'in_progress', 'closed'],
            },
            {
                field: 'created_at',
                headerName: 'Creato',
                flex: 1,
                minWidth: 130,
                maxWidth: 160,
                valueFormatter: (params: { value: string }) => formatDate(params.value),
                cellClass: 'text-[hsl(var(--muted-foreground))] text-sm',
            },
            {
                field: 'updated_at',
                headerName: 'Ultimo update',
                flex: 1,
                minWidth: 160,
                maxWidth: 180,
                valueFormatter: (params: { value: string }) => formatDate(params.value),
                cellClass: 'text-[hsl(var(--muted-foreground))] text-sm',
            },
            {
                colId: 'actions',
                field: '__actions__',
                headerName: 'Azioni',
                flex: 0,
                width: 96,
                minWidth: 96,
                maxWidth: 96,
                pinned: 'right',
                suppressSizeToFit: true,
                filter: false,
                sortable: false,
                resizable: false,
                lockPosition: 'right',
                cellRenderer: 'actionsRenderer',
                cellClass: 'actions-cell',
                headerClass: 'actions-header',
            },
        ],
        defaultColDef: {
            sortable: true,
            resizable: true,
            // Filter config managed by DataGrid component
        },
        enableQuickFilter: true,
        enableExport: true,
        enableColumnToggle: false,
        headerHeight: 52,
        rowHeight: 52,
        animateRows: true,
        suppressCellFocus: true,
    }

    return {
        gridConfig,
        formatDate,
        formatStatus,
    }
}
