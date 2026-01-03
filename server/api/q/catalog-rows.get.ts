import { QueryKeys } from '~/types/queries';
import { createQueryHandler, defineQuery } from '#utils/registry';
import { PriceListItem } from '#models/price-list-item.schema';
import type { FilterQuery } from 'mongoose';

export default createQueryHandler(defineQuery({
    id: QueryKeys.CATALOG_ROWS_PAGED,
    scope: 'authenticated',
    handler: async (event, args) => {
        const { page = 1, limit = 50, search, wbs6, wbs7, project_id, business_unit, sort } = args;

        const query: FilterQuery<typeof PriceListItem> = {};

        if (project_id) {
            query.project_id = project_id;
        }

        if (business_unit && business_unit.length > 0) {
            // Assuming business_unit array or single? Type says string[] for generic filter but args def might be string[]
            // In queries.ts I defined it as string[]
            query.business_unit = { $in: business_unit };
        }

        if (wbs6 && wbs6.length > 0) {
            query.wbs6_code = { $in: wbs6 };
        }

        if (wbs7 && wbs7.length > 0) {
            query.wbs7_code = { $in: wbs7 };
        }

        if (search) {
            query.$text = { $search: search };
        }

        // Sort
        let sortOptions: any = { code: 1 };
        if (sort) {
            // Simple sort parser: "field:asc" or "-field"
            if (sort.startsWith('-')) {
                sortOptions = { [sort.substring(1)]: -1 };
            } else {
                sortOptions = { [sort]: 1 };
            }
        } else if (search) {
            sortOptions = { score: { $meta: 'textScore' } };
        }

        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            PriceListItem.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .select('code description long_description extended_description unit price wbs6_code wbs6_description wbs7_code wbs7_description project_id project_name project_code business_unit')
                .lean(),
            PriceListItem.countDocuments(query)
        ]);

        return {
            items: items.map(i => ({
                ...i,
                _id: i._id.toString(),
                project_id: i.project_id?.toString()
            })) as any[], // Type assertion to match CatalogRow
            total,
            page,
            limit
        };
    }
}));
