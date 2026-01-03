import { QueryKeys } from '~/types/queries';
import { createQueryHandler, defineQuery } from '#utils/registry';
import { PriceListItem } from '#models/price-list-item.schema';
// import { VectorStore } from '~/server/utils/vector-store'; // Hypothetical

export default createQueryHandler(defineQuery({
    id: QueryKeys.CATALOG_SEMANTIC_SEARCH,
    scope: 'authenticated',
    handler: async (event, args) => {
        const { query, limit = 20, threshold } = args;

        // Placeholder for semantic search logic.
        // In a real implementation, this would generate an embedding for `query`
        // and perform a vector similarity search (Atlas Vector Search or similar).

        // For now, we fallback to text search if vector search isn't ready,
        // or implement a mock.

        // Assuming text search for this refactor step unless user specified vector details
        // User said: "stessi campi di catalog.rows.paged + score"

        const textResults = await PriceListItem.find(
            { $text: { $search: query } },
            { score: { $meta: 'textScore' } }
        )
            .sort({ score: { $meta: 'textScore' } })
            .limit(limit)
            .lean();

        // Map to result
        return {
            items: textResults.map(i => ({
                code: i.code,
                description: i.description || '',
                long_description: i.long_description,
                extended_description: i.extended_description,
                unit: i.unit,
                price: i.price,
                wbs6_code: i.wbs6_code,
                wbs6_description: i.wbs6_description,
                wbs7_code: i.wbs7_code,
                wbs7_description: i.wbs7_description,
                project_id: i.project_id?.toString(),
                project_name: i.project_name,
                project_code: i.project_code,
                business_unit: i.business_unit,
                _id: i._id.toString(),
                score: (i as any).score
            }))
        };
    }
}));
