import { QueryKeys } from '~/types/queries';
import { createQueryHandler, defineQuery } from '#utils/registry';
import { Project } from '#models/project.schema';
import { Estimate } from '#models/estimate.schema';

export default createQueryHandler(defineQuery({
    id: QueryKeys.PROJECT_LIST,
    scope: 'public', // or proteced
    handler: async (event, args) => {
        const { search, status, sort } = args;

        const filter: any = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } }
            ];
        }
        if (status && status.length > 0) {
            filter.status = { $in: status };
        }

        // We need counts of estimates/offers per project
        // Use aggregation
        const pipeline: any[] = [
            { $match: filter },
            {
                $lookup: {
                    from: 'estimates',
                    localField: '_id',
                    foreignField: 'project_id',
                    as: 'estimates_data'
                }
            },
            {
                $project: {
                    name: 1,
                    code: 1,
                    business_unit: 1,
                    status: 1,
                    updated_at: 1,
                    estimates_count: {
                        $size: {
                            $filter: {
                                input: '$estimates_data',
                                as: 'est',
                                cond: { $eq: ['$$est.type', 'project'] }
                            }
                        }
                    },
                    offers_count: {
                        $size: {
                            $filter: {
                                input: '$estimates_data',
                                as: 'est',
                                cond: { $eq: ['$$est.type', 'offer'] }
                            }
                        }
                    }
                }
            }
        ];

        if (sort) {
            const [field, dir] = sort.split(':');
            pipeline.push({ $sort: { [field]: dir === 'desc' ? -1 : 1 } });
        } else {
            pipeline.push({ $sort: { updated_at: -1 } });
        }

        const items = await Project.aggregate(pipeline);

        // Transform _id to id
        const results = items.map(p => ({
            ...p,
            id: p._id.toString(),
            _id: undefined
        }));

        return {
            items: results,
            total: results.length
        };
    }
}));
