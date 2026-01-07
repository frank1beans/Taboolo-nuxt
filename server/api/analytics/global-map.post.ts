/**
 * Global Map Data Proxy
 * Proxies to Python backend for multi-project semantic map.
 */

interface GlobalMapParams {
    project_ids?: string[] | null
    year?: number | null
    business_unit?: string | null
}

export default defineEventHandler(async (event) => {
    const body = await readBody<GlobalMapParams>(event)
    const config = useRuntimeConfig()
    const pythonUrl = config.pythonApiBaseUrl || 'http://localhost:8000/api/v1'

    // Build clean request body - FastAPI doesn't like undefined values
    const requestBody: Record<string, unknown> = {}

    if (body?.project_ids && body.project_ids.length > 0) {
        requestBody.project_ids = body.project_ids
    }
    if (body?.year !== undefined && body.year !== null) {
        requestBody.year = body.year
    }
    if (body?.business_unit !== undefined && body.business_unit !== null) {
        requestBody.business_unit = body.business_unit
    }

    try {
        const response = await $fetch(`${pythonUrl}/analytics/global/map-data`, {
            method: 'POST',
            body: requestBody,
            headers: {
                'Content-Type': 'application/json'
            }
        })

        return response
    } catch (error: any) {
        console.error('Global map proxy error:', error)
        if (error.data) {
            console.error('Upstream error data:', error.data)
        }

        const errMessage = error instanceof Error ? error.message : 'Failed to fetch global map data'
        const detail = error.data?.detail || (typeof error.data === 'string' ? error.data : '')

        throw createError({
            statusCode: 500,
            message: detail ? `${errMessage}: ${detail}` : errMessage
        })
    }
})
