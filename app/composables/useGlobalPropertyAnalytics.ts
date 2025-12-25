/**
 * Global Property Analytics Composable
 * ============================
 * Manages state and API calls for cross-project property analytics.
 * Extends useBaseAnalytics with property-specific functionality.
 */

import type { ProjectInfo } from '~/types/analytics'
import { useBaseAnalytics } from './useBaseAnalytics'

export interface PropertySlot {
    value: string | number | boolean | Array<unknown> | null
    evidence?: string | string[] | null
    confidence: number
}

export interface PropertyPoint {
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
    extracted_properties: Record<string, PropertySlot>
    property_keys?: string[]
    properties_count?: number
}

export interface PropertyMapResponse {
    points: PropertyPoint[]
    projects: ProjectInfo[]
    poles?: Array<{
        wbs6?: string
        project_id?: string
        description?: string
        x: number
        y: number
        z?: number
        type?: string
    }>
}

export const useGlobalPropertyAnalytics = () => {
    // Base functionality
    const base = useBaseAnalytics<PropertyMapResponse>({
        endpoint: '/api/analytics/global-property-map',
        computeEndpoint: '/api/analytics/global-compute-property-map'
    })

    // Property-specific compute states
    const isComputingProperties = ref(false)
    const computePropertiesResult = ref<{ status: string; max_items?: number } | null>(null)

    // Override computeMap to add property-specific options
    const computeMap = async (options?: {
        embeddingMode?: 'description' | 'properties' | 'weighted' | 'concat'
        baseWeight?: number
        detailWeight?: number
        minConfidence?: number
    }) => {
        return base.computeMap({
            embedding_mode: options?.embeddingMode ?? 'weighted',
            base_weight: options?.baseWeight ?? 0.4,
            detail_weight: options?.detailWeight ?? 0.6,
            min_confidence: options?.minConfidence ?? 0.5
        })
    }

    // Property extraction
    const computeProperties = async (options?: {
        maxItems?: number
        sleepSeconds?: number
        minConfidence?: number
    }) => {
        isComputingProperties.value = true
        base.mapError.value = null

        try {
            const response = await $fetch<{ status: string; max_items?: number }>('/api/analytics/global-compute-properties', {
                method: 'POST',
                body: {
                    ...base.buildRequestBody(),
                    only_missing: true,
                    max_items: options?.maxItems ?? 200,
                    sleep_seconds: options?.sleepSeconds ?? 1.0,
                    min_confidence: options?.minConfidence ?? 0.0
                }
            })
            computePropertiesResult.value = response
            return response
        } catch (e: unknown) {
            console.error('Failed to compute properties:', e)
            base.mapError.value = e instanceof Error ? e.message : 'Failed to compute properties'
            return null
        } finally {
            isComputingProperties.value = false
        }
    }

    // Points computed
    const points = computed(() => base.mapData.value?.points ?? [])
    const poles = computed(() => base.mapData.value?.poles ?? [])

    const filteredPoints = computed(() => {
        let pts = points.value
        if (base.filters.projectIds.length > 0) {
            pts = pts.filter(p => base.filters.projectIds.includes(p.project_id))
        }
        return pts
    })

    // Property statistics
    const propertyKeyStats = computed(() => {
        const counts = new Map<string, number>()
        filteredPoints.value.forEach(point => {
            const keys = point.property_keys?.length
                ? point.property_keys
                : Object.keys(point.extracted_properties || {})
            keys.forEach(key => {
                counts.set(key, (counts.get(key) ?? 0) + 1)
            })
        })
        return Array.from(counts.entries())
            .map(([key, count]) => ({ key, count }))
            .sort((a, b) => b.count - a.count)
    })

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
        resetFilters: base.resetFilters,

        // Property-specific
        computeMap,
        computeProperties,
        isComputingProperties,
        points,
        poles,
        filteredPoints,
        propertyKeyStats
    }
}
