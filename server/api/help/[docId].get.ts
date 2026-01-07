import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * API endpoint to serve help documentation content
 * GET /api/help/:docId
 */
export default defineEventHandler(async (event) => {
    const docId = getRouterParam(event, 'docId')

    if (!docId) {
        throw createError({
            statusCode: 400,
            message: 'Document ID is required'
        })
    }

    // Sanitize docId to prevent path traversal
    const safeDocId = docId.replace(/[^a-zA-Z0-9-_]/g, '')

    // Build path to doc file
    const docsPath = join(process.cwd(), 'docs', 'user-guide', `${safeDocId}.md`)

    try {
        const content = await readFile(docsPath, 'utf-8')

        // Extract title from first line (# Title)
        const titleMatch = content.match(/^#\s+(.+)$/m)
        const title = titleMatch ? titleMatch[1] : safeDocId

        return {
            content,
            title,
            docId: safeDocId
        }
    } catch (error: any) {
        // If file not found, try FAQ
        if (error.code === 'ENOENT') {
            const faqPath = join(process.cwd(), 'docs', 'user-guide', 'FAQ.md')
            try {
                const content = await readFile(faqPath, 'utf-8')
                return {
                    content,
                    title: 'FAQ',
                    docId: 'FAQ'
                }
            } catch {
                throw createError({
                    statusCode: 404,
                    message: `Documentation not found: ${safeDocId}`
                })
            }
        }

        throw createError({
            statusCode: 500,
            message: 'Failed to load documentation'
        })
    }
})
