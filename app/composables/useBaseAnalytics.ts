/**
 * Base Analytics Composable
 * =========================
 * Shared logic for analytics composables (filters, loading states, available options).
 * Used by useGlobalAnalytics and useGlobalPropertyAnalytics.
 */

import type { GlobalFilters, ProjectInfo } from '~/types/analytics'

export interface BaseMapResponse {
    projects: ProjectInfo[]
}

export interface BaseAnalyticsOptions<_TResponse extends BaseMapResponse> {
    endpoint: string
    computeEndpoint?: string
}

const defaultFilters: GlobalFilters = {
    projectIds: [],
    year: null,
    businessUnit: null
}

export function useBaseAnalytics<TResponse extends BaseMapResponse>(
    options: BaseAnalyticsOptions<TResponse>
) {
    // Filters
    const filters = reactive<GlobalFilters>({ ...defaultFilters })

    // Map data
    const mapData = ref<TResponse | null>(null)
    const isLoadingMap = ref(false)
    const mapError = ref<string | null>(null)

    // Compute state
    const isComputingMap = ref(false)
    const computeMapResult = ref<{ status: string; project_count?: number } | null>(null)

    // Available filter options (populated from map data)
    const availableProjects = computed(() => mapData.value?.projects ?? [])

    const availableYears = computed(() => {
        const years = new Set<number>()
        mapData.value?.projects.forEach((p: { year?: number | null }) => {
            if (p.year) years.add(p.year)
        })
        return Array.from(years).sort((a, b) => b - a)
    })

    const availableBusinessUnits = computed(() => {
        const units = new Set<string>()
        mapData.value?.projects.forEach((p: { business_unit?: string | null }) => {
            if (p.business_unit) units.add(p.business_unit)
        })
        return Array.from(units).sort()
    })

    // Build request body for API
    const buildRequestBody = () => ({
        project_ids: filters.projectIds.length > 0 ? filters.projectIds : null,
        year: filters.year,
        business_unit: filters.businessUnit
    })

    // Fetch map data
    const fetchMapData = async () => {
        isLoadingMap.value = true
        mapError.value = null

        try {
            const response = await $fetch<TResponse>(options.endpoint, {
                method: 'POST',
                body: buildRequestBody()
            })
            mapData.value = response
        } catch (e: unknown) {
            console.error(`Failed to fetch from ${options.endpoint}:`, e)
            mapError.value = e instanceof Error ? e.message : 'Failed to load map'
        } finally {
            isLoadingMap.value = false
        }
    }

    // Compute map (if endpoint provided)
    const computeMap = async (extraBody?: Record<string, unknown>) => {
        if (!options.computeEndpoint) return null

        isComputingMap.value = true
        mapError.value = null

        try {
            const response = await $fetch<{ status: string; project_count?: number }>(options.computeEndpoint, {
                method: 'POST',
                body: {
                    ...buildRequestBody(),
                    force: false,
                    ...extraBody
                }
            })
            computeMapResult.value = response
            return response
        } catch (e: unknown) {
            console.error('Failed to compute map:', e)
            mapError.value = e instanceof Error ? e.message : 'Failed to compute map'
            return null
        } finally {
            isComputingMap.value = false
        }
    }

    // Reset filters
    const resetFilters = () => {
        Object.assign(filters, defaultFilters)
    }

    // Note: Initial data fetch is NOT automatic.
    // The calling component should call fetchMapData() explicitly when needed.
    // This prevents duplicate API calls when multiple analytics composables are used.

    return {
        // State
        filters,
        mapData,
        isLoadingMap,
        mapError,
        isComputingMap,
        computeMapResult,

        // Options
        availableProjects,
        availableYears,
        availableBusinessUnits,

        // Methods
        buildRequestBody,
        fetchMapData,
        computeMap,
        resetFilters
    }
}
