/**
 * Global Analytics Composable
 * ============================
 * Manages state and API calls for cross-project analytics.
 */

export interface GlobalFilters {
    projectIds: string[]
    year: number | null
    businessUnit: string | null
}

export interface ProjectInfo {
    id: string
    name: string
    code: string
    business_unit: string | null
    year: number | null
}

export interface GlobalPoint {
    id: string
    project_id: string
    project_name: string
    x: number
    y: number
    z: number
    cluster: number
    label: string
    code: string
    price: number | null
    unit: string
    wbs06: string
    wbs06_desc: string
}

export interface GlobalMapResponse {
    points: GlobalPoint[]
    projects: ProjectInfo[]
}

export interface GlobalAnalysisParams {
    topK: number
    minSimilarity: number
    madThreshold: number
    minCategorySize: number
    estimationMethod: 'weighted_median' | 'trimmed_mean'
    wbs6Filter: string | null
    includeNeighbors: boolean
}

const defaultFilters: GlobalFilters = {
    projectIds: [],
    year: null,
    businessUnit: null
}

const defaultAnalysisParams: GlobalAnalysisParams = {
    topK: 30,
    minSimilarity: 0.55,
    madThreshold: 2.0,
    minCategorySize: 3,
    estimationMethod: 'weighted_median',
    wbs6Filter: null,
    includeNeighbors: true
}

export const useGlobalAnalytics = () => {
    // Filters
    const filters = reactive<GlobalFilters>({ ...defaultFilters })
    const analysisParams = reactive<GlobalAnalysisParams>({ ...defaultAnalysisParams })

    // Map data
    const mapData = ref<GlobalMapResponse | null>(null)
    const isLoadingMap = ref(false)
    const mapError = ref<string | null>(null)

    // Analysis data
    const analysisResult = ref<any>(null)
    const isLoadingAnalysis = ref(false)
    const analysisError = ref<string | null>(null)

    // Available filter options (populated from map data)
    const availableProjects = computed(() => mapData.value?.projects ?? [])

    const availableYears = computed(() => {
        const years = new Set<number>()
        mapData.value?.projects.forEach(p => {
            if (p.year) years.add(p.year)
        })
        return Array.from(years).sort((a, b) => b - a)
    })

    const availableBusinessUnits = computed(() => {
        const units = new Set<string>()
        mapData.value?.projects.forEach(p => {
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

    const buildAnalysisRequestBody = () => ({
        ...buildRequestBody(),
        wbs6_filter: analysisParams.wbs6Filter,
        top_k: analysisParams.topK,
        min_similarity: analysisParams.minSimilarity,
        mad_threshold: analysisParams.madThreshold,
        min_category_size: analysisParams.minCategorySize,
        estimation_method: analysisParams.estimationMethod,
        include_neighbors: analysisParams.includeNeighbors
    })

    // Fetch map data
    const fetchMapData = async () => {
        isLoadingMap.value = true
        mapError.value = null

        try {
            const response = await $fetch<GlobalMapResponse>('/api/analytics/global-map', {
                method: 'POST',
                body: buildRequestBody()
            })
            mapData.value = response
        } catch (e: unknown) {
            console.error('Failed to fetch global map:', e)
            mapError.value = e instanceof Error ? e.message : 'Failed to load map'
        } finally {
            isLoadingMap.value = false
        }
    }

    // Run analysis
    const runAnalysis = async () => {
        isLoadingAnalysis.value = true
        analysisError.value = null

        try {
            const response = await $fetch('/api/analytics/global-price-analysis', {
                method: 'POST',
                body: buildAnalysisRequestBody()
            })
            analysisResult.value = response
        } catch (e: unknown) {
            console.error('Failed to run global analysis:', e)
            analysisError.value = e instanceof Error ? e.message : 'Analysis failed'
        } finally {
            isLoadingAnalysis.value = false
        }
    }

    // Compute UMAP for all projects
    const isComputingMap = ref(false)
    const computeMapResult = ref<{ status: string; project_count?: number } | null>(null)

    const computeMap = async () => {
        isComputingMap.value = true
        mapError.value = null

        try {
            const response = await $fetch<{ status: string; project_count?: number }>('/api/analytics/global-compute-map', {
                method: 'POST',
                body: {
                    project_ids: filters.projectIds.length > 0 ? filters.projectIds : null,
                    force: false
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

    // Computed helpers
    const points = computed(() => mapData.value?.points ?? [])

    const filteredPoints = computed(() => {
        let pts = points.value

        // Filter by selected projects
        if (filters.projectIds.length > 0) {
            pts = pts.filter(p => filters.projectIds.includes(p.project_id))
        }

        return pts
    })

    const outlierItems = computed(() => {
        if (!analysisResult.value) return []
        return analysisResult.value.categories?.flatMap((cat: any) =>
            cat.items.filter((i: any) => i.is_outlier)
        ) ?? []
    })

    const outlierIds = computed(() => {
        return new Set(outlierItems.value.map((item: any) => item.item_id))
    })

    const outlierPercent = computed(() => {
        if (!analysisResult.value || analysisResult.value.total_items === 0) return '0'
        return ((analysisResult.value.outliers_found / analysisResult.value.total_items) * 100).toFixed(1)
    })

    // Reset
    const resetFilters = () => {
        Object.assign(filters, defaultFilters)
    }

    const resetAnalysisParams = () => {
        Object.assign(analysisParams, defaultAnalysisParams)
    }

    // Initial load
    onMounted(() => {
        fetchMapData()
    })

    return {
        // Filters
        filters,
        analysisParams,

        // Data
        mapData,
        points,
        filteredPoints,
        analysisResult,

        // Loading/Error
        isLoadingMap,
        isLoadingAnalysis,
        mapError,
        analysisError,

        // Filter options
        availableProjects,
        availableYears,
        availableBusinessUnits,

        // Outliers
        outlierItems,
        outlierIds,
        outlierPercent,

        // Actions
        fetchMapData,
        runAnalysis,
        computeMap,
        isComputingMap,
        resetFilters,
        resetAnalysisParams
    }
}
