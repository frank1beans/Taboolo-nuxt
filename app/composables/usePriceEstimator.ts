/**
 * Price Estimator Composable
 * ==========================
 * Manages state and API calls for price estimation.
 */

import { formatCurrency } from '~/lib/formatters'

export interface ExtractedProperty {
    value: string | null
    confidence: number
    evidence?: string | null
}

export interface PropertyMatch {
    name: string
    query_value: string | null
    item_value: string | null
    is_match: boolean
    match_score: number
}

export interface SimilarItem {
    id: string
    code: string
    description: string
    price: number
    unit: string
    project_name: string
    similarity: number
    combined_score: number
    property_matches: PropertyMatch[]
}

export interface PriceEstimate {
    value: number
    range_low: number
    range_high: number
    confidence: number
    unit: string
    available_units: Record<string, number>
    method: string
}

export interface EstimationResult {
    query: string
    extracted_properties: Record<string, ExtractedProperty>
    estimated_price: PriceEstimate | null
    similar_items: SimilarItem[]
    error?: string | null
}

export interface EstimateRequest {
    query: string
    project_ids?: string[] | null
    top_k?: number
    min_similarity?: number
    unit?: string | null
}

export const usePriceEstimator = () => {
    // State
    const query = ref('')
    const isLoading = ref(false)
    const result = ref<EstimationResult | null>(null)
    const error = ref<string | null>(null)

    // Settings
    const topK = ref(10)
    const minSimilarity = ref(0.4)
    const selectedProjectIds = ref<string[]>([])
    const selectedUnit = ref<string | null>(null)

    // Estimate price
    const estimate = async (queryText?: string) => {
        const q = queryText ?? query.value

        if (!q || q.trim().length < 3) {
            error.value = 'La descrizione deve contenere almeno 3 caratteri'
            return
        }

        isLoading.value = true
        error.value = null
        result.value = null

        try {
            const response = await $fetch<EstimationResult>('/api/price-estimator/estimate', {
                method: 'POST',
                body: {
                    query: q.trim(),
                    project_ids: selectedProjectIds.value.length > 0 ? selectedProjectIds.value : null,
                    top_k: topK.value,
                    min_similarity: minSimilarity.value,
                    unit: selectedUnit.value,
                }
            })

            result.value = response

            if (response.error) {
                error.value = response.error
            }
        } catch (e: unknown) {
            console.error('Price estimation failed:', e)
            error.value = e instanceof Error ? e.message : 'Stima fallita'
        } finally {
            isLoading.value = false
        }
    }

    // Reset
    const reset = () => {
        query.value = ''
        result.value = null
        error.value = null
        selectedUnit.value = null
    }

    // Format confidence as percentage
    const formatConfidence = (value: number): string => {
        return `${Math.round(value * 100)}%`
    }

    return {
        // State
        query,
        isLoading,
        result,
        error,

        // Settings
        topK,
        minSimilarity,
        selectedProjectIds,
        selectedUnit,

        // Actions
        estimate,
        reset,

        // Formatters
        formatCurrency,
        formatConfidence,
    }
}
