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
    const pythonUrl = config.pythonApiBaseUrl || 'http://localhost:8000'

    try {
        const response = await $fetch(`${pythonUrl}/analytics/global/map-data`, {
            method: 'POST',
            body: body || {},
            headers: {
                'Content-Type': 'application/json'
            }
        })

        return response
    } catch (error: unknown) {
        console.error('Global map proxy error:', error)

        const errMessage = error instanceof Error ? error.message : 'Failed to fetch global map data'
        throw createError({
            statusCode: 500,
            message: errMessage
        })
    }
})
