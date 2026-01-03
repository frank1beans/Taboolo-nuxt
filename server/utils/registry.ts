import type { H3Event } from 'h3';
import { createError, defineEventHandler, getQuery } from 'h3';
import type { QueryId, QueryArgsMap, QueryResultMap } from '~/types/queries';

export interface QueryDefinition<K extends QueryId> {
    id: K;
    scope: 'public' | 'authenticated' | 'admin';
    cacheTtl?: number; // Seconds
    payloadBudget?: string; // e.g., '50kb' - description only for now
    handler: (event: H3Event, args: QueryArgsMap[K]) => Promise<QueryResultMap[K]>;
}

export function defineQuery<K extends QueryId>(
    definition: Omit<QueryDefinition<K>, 'id'> & { id: K } // Ensure ID matches generic
): QueryDefinition<K> {
    return definition;
}

// Registry map could be stored here if we needed a central list at runtime,
// but for standard handlers we might just rely on the file system or individual exports.
// If we want a central registry to validate existence, we can create a map.
// For now, this helper ensures type safety for the handler.

export function createQueryHandler<K extends QueryId>(
    definition: QueryDefinition<K>
) {
    return defineEventHandler(async (event) => {
        // Parse query params
        const query = getQuery(event);
        // Cast query to args - in a real app we might use zod/valibot to validate
        const args = query as unknown as QueryArgsMap[K];

        try {
            const result = await definition.handler(event, args);
            return result;
        } catch (error) {
            console.error(`Query Error [${definition.id}]:`, error);
            const err = error as { statusCode?: number; statusMessage?: string; data?: unknown };
            if (err && typeof err.statusCode === 'number') {
                throw createError({
                    statusCode: err.statusCode,
                    statusMessage: err.statusMessage ?? 'Request failed',
                    data: err.data,
                    cause: error,
                });
            }
            throw createError({
                statusCode: 500,
                statusMessage: 'Internal Server Error',
                data: error
            });
        }
    });
}
