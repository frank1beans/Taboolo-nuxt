import { QueryKeys } from '~/types/queries';
import { createQueryHandler, defineQuery } from '#utils/registry';
import { PriceListItem } from '#models/price-list-item.schema';
import { FilterQuery } from 'mongoose';

export default createQueryHandler(defineQuery({
    id: QueryKeys.CATALOG_WBS_SUMMARY,
    scope: 'authenticated',
    handler: async (event, args) => {
        const { project_id, search } = args;

        const query: FilterQuery<typeof PriceListItem> = {};
        if (project_id) {
            query.project_id = project_id;
        }
        if (search) {
            query.$text = { $search: search };
        }

        // Aggregate to get distinct WBS combinations
        const results = await PriceListItem.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        wbs6_code: '$wbs6_code',
                        wbs6_description: '$wbs6_description',
                        wbs7_code: '$wbs7_code',
                        wbs7_description: '$wbs7_description'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.wbs6_code': 1, '_id.wbs7_code': 1 } },
            {
                $project: {
                    _id: 0,
                    wbs6_code: '$_id.wbs6_code',
                    wbs6_description: '$_id.wbs6_description',
                    wbs7_code: '$_id.wbs7_code',
                    wbs7_description: '$_id.wbs7_description',
                    count: 1
                }
            }
        ]);

        return {
            items: results
        };
    }
}));
