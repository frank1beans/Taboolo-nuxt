/**
 * Global Compute Property Map Proxy
 * Triggers UMAP computation using properties-aware embeddings.
 */

interface GlobalComputePropertyMapParams {
    project_ids?: string[] | null
    year?: number | null
    business_unit?: string | null
    embedding_mode?: 'description' | 'properties' | 'weighted' | 'concat'
    base_weight?: number
    detail_weight?: number
    min_confidence?: number
}

export default defineEventHandler(async (event) => {
    const body = await readBody<GlobalComputePropertyMapParams>(event)
    const config = useRuntimeConfig()
    const pythonUrl = config.pythonApiBaseUrl || 'http://localhost:8000'

    try {
        const response = await $fetch(`${pythonUrl}/analytics/global/compute-property-map`, {
            method: 'POST',
            body: body || {},
            headers: {
                'Content-Type': 'application/json'
            }
        })

        return response
    } catch (error: unknown) {
        console.error('Global compute-property-map proxy error:', error)

        const errMessage = error instanceof Error ? error.message : 'Failed to trigger property map computation'
        throw createError({
            statusCode: 500,
            message: errMessage
        })
    }
})
