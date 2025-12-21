/**
 * Global Price Analysis Proxy
 * Proxies to Python backend for multi-project price analysis.
 */

interface GlobalAnalysisParams {
    project_ids?: string[] | null
    year?: number | null
    business_unit?: string | null
    wbs6_filter?: string | null
    top_k?: number
    min_similarity?: number
    mad_threshold?: number
    min_category_size?: number
    estimation_method?: string
    include_neighbors?: boolean
}

export default defineEventHandler(async (event) => {
    const body = await readBody<GlobalAnalysisParams>(event)
    const config = useRuntimeConfig()
    const pythonUrl = config.pythonApiBaseUrl || 'http://localhost:8000'

    try {
        const response = await $fetch(`${pythonUrl}/analytics/global/price-analysis`, {
            method: 'POST',
            body: body || {},
            headers: {
                'Content-Type': 'application/json'
            }
        })

        return response
    } catch (error: unknown) {
        console.error('Global analysis proxy error:', error)

        const errMessage = error instanceof Error ? error.message : 'Global price analysis failed'
        throw createError({
            statusCode: 500,
            message: errMessage
        })
    }
})
