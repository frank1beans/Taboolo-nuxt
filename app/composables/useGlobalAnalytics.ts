/**
 * Global Analytics Composable
 * ============================
 * Manages state and API calls for cross-project analytics.
 * Extends useBaseAnalytics with analysis-specific functionality.
 */

import type { ProjectInfo } from '~/types/analytics'
import { useBaseAnalytics } from './useBaseAnalytics'

export interface GlobalPoint {
    id: string
    project_id: string
    project_name: string
    x: number
    y: number
    z: number
    cluster: number
    label: string
    long_description: string
    code: string
    price: number | null
    unit: string
    wbs06: string
    wbs06_desc: string
}

export interface GlobalMapMeta {
    version?: string | null
    updated_at?: string | null
}

export interface GlobalMapResponse {
    points: GlobalPoint[]
    projects: ProjectInfo[]
    map_meta?: GlobalMapMeta
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
    // Base functionality
    const base = useBaseAnalytics<GlobalMapResponse>({
        endpoint: '/api/analytics/global-map',
        computeEndpoint: '/api/analytics/global-compute-map'
    })

    // Analysis-specific state
    const analysisParams = reactive<GlobalAnalysisParams>({ ...defaultAnalysisParams })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analysisResult = ref<any>(null)
    const isLoadingAnalysis = ref(false)
    const analysisError = ref<string | null>(null)

    // Analysis request builder
    const buildAnalysisRequestBody = () => ({
        ...base.buildRequestBody(),
        wbs6_filter: analysisParams.wbs6Filter,
        top_k: analysisParams.topK,
        min_similarity: analysisParams.minSimilarity,
        mad_threshold: analysisParams.madThreshold,
        min_category_size: analysisParams.minCategorySize,
        estimation_method: analysisParams.estimationMethod,
        include_neighbors: analysisParams.includeNeighbors
    })

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

    // Points computed
    const points = computed(() => base.mapData.value?.points ?? [])
    const mapMeta = computed(() => base.mapData.value?.map_meta ?? null)

    const filteredPoints = computed(() => {
        let pts = points.value
        if (base.filters.projectIds.length > 0) {
            pts = pts.filter(p => base.filters.projectIds.includes(p.project_id))
        }
        return pts
    })

    // Outlier computed helpers
    const outlierItems = computed(() => {
        if (!analysisResult.value) return []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return analysisResult.value.categories?.flatMap((cat: any) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cat.items.filter((i: any) => i.is_outlier)
        ) ?? []
    })

    const outlierIds = computed(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new Set(outlierItems.value.map((item: any) => item.item_id))
    })

    const outlierPercent = computed(() => {
        if (!analysisResult.value || analysisResult.value.total_items === 0) return '0'
        return ((analysisResult.value.outliers_found / analysisResult.value.total_items) * 100).toFixed(1)
    })

    const resetAnalysisParams = () => {
        Object.assign(analysisParams, defaultAnalysisParams)
    }

    const waitForMapUpdate = async (options?: { pollIntervalsMs?: number[] }) => {
        const previousUpdatedAt = mapMeta.value?.updated_at ?? null
        const intervals = options?.pollIntervalsMs ?? [2000, 4000, 6000, 8000, 10000]

        for (const delayMs of intervals) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
            await base.fetchMapData()
            const nextUpdatedAt = mapMeta.value?.updated_at ?? null
            if (nextUpdatedAt && nextUpdatedAt !== previousUpdatedAt) {
                return true
            }
        }

        return false
    }

    // Map parameters state
    const mapParams = reactive({
        n_neighbors: 30,
        min_dist: 0.0,
        metric: 'cosine',
        min_cluster_size: 5
    })

    // Recalculate map with current params
    const recalculateMap = async () => {
        return await base.computeMap({
            n_neighbors: mapParams.n_neighbors,
            min_dist: mapParams.min_dist,
            metric: mapParams.metric,
            min_cluster_size: mapParams.min_cluster_size
        })
    }

    return {
        // From base
        filters: base.filters,
        mapData: base.mapData,
        isLoadingMap: base.isLoadingMap,
        mapError: base.mapError,
        isComputingMap: base.isComputingMap,
        availableProjects: base.availableProjects,
        availableYears: base.availableYears,
        availableBusinessUnits: base.availableBusinessUnits,
        fetchMapData: base.fetchMapData,
        computeMap: base.computeMap,
        resetFilters: base.resetFilters,

        // Analysis-specific
        analysisParams,
        analysisResult,
        isLoadingAnalysis,
        analysisError,
        points,
        filteredPoints,
        outlierItems,
        outlierIds,
        outlierPercent,
        runAnalysis,
        resetAnalysisParams,
        mapMeta,
        waitForMapUpdate,

        // Map Params
        mapParams,
        recalculateMap
    }
}
