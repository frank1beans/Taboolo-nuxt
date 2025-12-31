/**
 * Price Estimator Proxy
 * Proxies to Python backend for price estimation.
 */

interface EstimateRequest {
    query: string
    project_ids?: string[] | null
    top_k?: number
    min_similarity?: number
}

export default defineEventHandler(async (event) => {
    const body = await readBody<EstimateRequest>(event)
    const config = useRuntimeConfig()
    const pythonUrl = config.pythonApiBaseUrl || 'http://localhost:8000/api/v1'

    if (!body?.query || body.query.trim().length < 3) {
        throw createError({
            statusCode: 400,
            message: 'Query must be at least 3 characters'
        })
    }

    try {
        const response = await $fetch(`${pythonUrl}/price-estimator/estimate`, {
            method: 'POST',
            body: {
                query: body.query,
                project_ids: body.project_ids || null,
                top_k: body.top_k || 10,
                min_similarity: body.min_similarity || 0.4,
            },
            headers: {
                'Content-Type': 'application/json'
            }
        })

        return response
    } catch (error: unknown) {
        console.error('Price estimator proxy error:', error)

        const errMessage = error instanceof Error ? error.message : 'Failed to estimate price'
        throw createError({
            statusCode: 500,
            message: errMessage
        })
    }
})
