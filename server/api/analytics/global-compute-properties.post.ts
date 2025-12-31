/**
 * Global Compute Properties Proxy
 * Triggers batch LLM extraction for properties.
 */

interface GlobalComputePropertiesParams {
    project_ids?: string[] | null
    year?: number | null
    business_unit?: string | null
    only_missing?: boolean
    max_items?: number | null
    sleep_seconds?: number
    min_confidence?: number
}

export default defineEventHandler(async (event) => {
    const body = await readBody<GlobalComputePropertiesParams>(event)
    const config = useRuntimeConfig()
    const pythonUrl = config.pythonApiBaseUrl || 'http://localhost:8000/api/v1'

    try {
        const response = await $fetch(`${pythonUrl}/analytics/global/compute-properties`, {
            method: 'POST',
            body: body || {},
            headers: {
                'Content-Type': 'application/json'
            }
        })

        return response
    } catch (error: unknown) {
        console.error('Global compute-properties proxy error:', error)

        const errMessage = error instanceof Error ? error.message : 'Failed to trigger property extraction'
        throw createError({
            statusCode: 500,
            message: errMessage
        })
    }
})
