import type { QueryId, QueryArgsMap, QueryResultMap } from '~/types/queries';

class QueryClient {
    async fetch<K extends QueryId>(
        id: K,
        params: QueryArgsMap[K]
    ): Promise<QueryResultMap[K]> {
        // Determine endpoint based on ID convention or mapping
        // Convention: catalog.rows.paged -> /api/q/catalog-rows
        // But for now, we might map explicitly or use a specific endpoint structure.
        // The user requirement says: "GET /api/q/catalog-rows in catalog-rows.get.ts"

        // We can map ID to endpoint slug
        const slug = this.getSlug(id);

        return await $fetch<QueryResultMap[K]>(`/api/q/${slug}`, {
            params: params as Record<string, any>, // Normalize params if needed
            // Add standard headers, etc.
        });
    }

    private getSlug(id: QueryId): string {
        // Simple mapping or transformation
        // catalog.rows.paged -> catalog-rows
        // project.dashboard -> project-dashboard

        const parts = id.split('.');
        if (parts.length >= 2) {
            // Take the first two parts joined by hyphen?
            // catalog.rows.paged -> catalog-rows
            // catalog.wbs.summary -> catalog-wbs
            // catalog.summary -> catalog-summary
            // But wait:
            // catalog.rows.paged -> catalog-rows
            // catalog.wbs.summary -> catalog-wbs
            // catalog.summary -> catalog-summary
            // catalog.semantic.search -> catalog-semantic (as per user req)
            // project.dashboard -> project-dashboard
            // estimate.summary -> estimate-summary

            // It seems the convention is [module]-[submodule/function]
            // Let's implement a map or a heuristic. 
            // User explicitly listed:
            // catalog.rows.paged -> catalog-rows
            // catalog.wbs.summary -> catalog-wbs
            // catalog.summary -> catalog-summary
            // catalog.semantic.search -> catalog-semantic

            // Heuristic: Join first two parts with hyphen, ignore the rest?
            // catalog.rows.paged -> catalog-rows
            // catalog.wbs.summary -> catalog-wbs

            // Exception: catalog.summary -> catalog-summary (only 2 parts)

            return parts.slice(0, 2).join('-');
        }
        return id.replace(/\./g, '-');
    }
}

export const queryApi = new QueryClient();
