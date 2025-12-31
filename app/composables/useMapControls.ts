/**
 * useMapControls.ts
 * 
 * Shared composable for semantic map visualization controls.
 * Used by both Global Analytics and Property Analytics modes.
 */

import { ref, reactive, watch, type Ref } from 'vue'

export interface MapControlsOptions {
    defaultPointSize?: number
    defaultIs3D?: boolean
    defaultShowAxes?: boolean
    defaultShowPoles?: boolean
    defaultColorBy?: string
}

export interface ProjectOption {
    label: string
    value: string
}

export interface MapFilterState {
    projectIds: string[]
    year: number | null
    businessUnit: string | null
}

export interface MapControlsReturn {
    // Visualization
    pointSize: Ref<number>
    is3D: Ref<boolean>
    showAxes: Ref<boolean>
    showPoles: Ref<boolean>
    colorBy: Ref<string>

    // Filters
    filters: MapFilterState
    selectedProjects: Ref<ProjectOption[]>
    selectedYear: Ref<{ label: string; value: number | null } | null>
    selectedBU: Ref<{ label: string; value: string | null } | null>

    // Actions
    resetFilters: () => void
    resetVisualization: () => void

    // Color palette helpers
    getProjectColor: (projectId: string, projects: { id: string }[]) => string
    getClusterColor: (clusterId: number) => string
    getWbs06Color: (wbs06: string, colorMap: Map<string, string>) => string
}

// Color palettes
const PROJECT_PALETTE = [
    '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#a855f7', '#10b981', '#f43f5e', '#0ea5e9'
]

const CLUSTER_PALETTE = [
    '#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ef4444',
    '#14b8a6', '#eab308', '#ec4899', '#0ea5e9', '#f59e0b',
    '#10b981', '#6366f1', '#d946ef', '#84cc16', '#06b6d4',
    '#f43f5e', '#8b5cf6', '#64748b'
]

const WBS06_PALETTE = [
    '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#a855f7', '#10b981', '#f43f5e', '#0ea5e9',
    '#78716c', '#ea580c', '#65a30d', '#0891b2', '#7c3aed',
    '#db2777', '#0284c7', '#4d7c0f', '#dc2626', '#9333ea',
    '#059669', '#d97706', '#2563eb', '#c026d3', '#16a34a'
]

export function useMapControls(options: MapControlsOptions = {}): MapControlsReturn {
    const {
        defaultPointSize = 12,
        defaultIs3D = false,
        defaultShowAxes = false,
        defaultShowPoles = true,
        defaultColorBy = 'project'
    } = options

    // Visualization state
    const pointSize = ref(defaultPointSize)
    const is3D = ref(defaultIs3D)
    const showAxes = ref(defaultShowAxes)
    const showPoles = ref(defaultShowPoles)
    const colorBy = ref(defaultColorBy)

    // Filter state
    const selectedProjects = ref<ProjectOption[]>([])
    const selectedYear = ref<{ label: string; value: number | null } | null>(null)
    const selectedBU = ref<{ label: string; value: string | null } | null>(null)

    const filters: MapFilterState = reactive({
        projectIds: [],
        year: null,
        businessUnit: null
    })

    // Sync selectedProjects to filters
    watch(selectedProjects, (val) => {
        filters.projectIds = val.map(p => p.value)
    }, { deep: true })

    watch(selectedYear, (val) => {
        filters.year = val?.value ?? null
    })

    watch(selectedBU, (val) => {
        filters.businessUnit = val?.value ?? null
    })

    // Actions
    const resetFilters = () => {
        selectedProjects.value = []
        selectedYear.value = null
        selectedBU.value = null
    }

    const resetVisualization = () => {
        pointSize.value = defaultPointSize
        is3D.value = defaultIs3D
        showAxes.value = defaultShowAxes
        showPoles.value = defaultShowPoles
        colorBy.value = defaultColorBy
    }

    // Color helpers
    const getProjectColor = (projectId: string, projects: { id: string }[]): string => {
        const idx = projects.findIndex(p => p.id === projectId)
        if (idx < 0) return PROJECT_PALETTE[0] ?? '#3b82f6'
        return PROJECT_PALETTE[idx % PROJECT_PALETTE.length] ?? '#3b82f6'
    }

    const getClusterColor = (clusterId: number): string => {
        if (clusterId < 0) return '#888888'
        return CLUSTER_PALETTE[clusterId % CLUSTER_PALETTE.length] ?? '#3b82f6'
    }

    const getWbs06Color = (wbs06: string, colorMap: Map<string, string>): string => {
        return colorMap.get(wbs06 || 'N/A') ?? WBS06_PALETTE[0] ?? '#3b82f6'
    }

    return {
        pointSize,
        is3D,
        showAxes,
        showPoles,
        colorBy,
        filters,
        selectedProjects,
        selectedYear,
        selectedBU,
        resetFilters,
        resetVisualization,
        getProjectColor,
        getClusterColor,
        getWbs06Color
    }
}

// Export palettes for external use
export { PROJECT_PALETTE, CLUSTER_PALETTE, WBS06_PALETTE }
