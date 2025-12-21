/**
 * Global Compute Map Proxy
 * Triggers UMAP computation for multiple projects.
 */

interface GlobalComputeMapParams {
    project_ids?: string[] | null
    force?: boolean
}

export default defineEventHandler(async (event) => {
    const body = await readBody<GlobalComputeMapParams>(event)
    const config = useRuntimeConfig()
    const pythonUrl = config.pythonApiBaseUrl || 'http://localhost:8000'

    try {
        const response = await $fetch(`${pythonUrl}/analytics/global/compute-map`, {
            method: 'POST',
            body: body || {},
            headers: {
                'Content-Type': 'application/json'
            }
        })

        return response
    } catch (error: unknown) {
        console.error('Global compute-map proxy error:', error)

        const errMessage = error instanceof Error ? error.message : 'Failed to trigger UMAP computation'
        throw createError({
            statusCode: 500,
            message: errMessage
        })
    }
})
