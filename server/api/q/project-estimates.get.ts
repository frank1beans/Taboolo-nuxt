import { QueryKeys } from '~/types/queries';
import { createQueryHandler, defineQuery } from '#utils/registry';
import { Estimate } from '#models/estimate.schema';

export default createQueryHandler(defineQuery({
    id: QueryKeys.PROJECT_ESTIMATES,
    scope: 'public',
    handler: async (event, args) => {
        const { project_id, type } = args;

        const filter: any = { project_id };
        if (type) {
            filter.type = type;
        }

        const items = await Estimate.find(filter).sort({ created_at: -1 }).lean();

        return {
            items: items.map(item => ({
                id: item._id.toString(),
                project_id: item.project_id.toString(),
                name: item.name,
                type: item.type,
                status: 'active', // TODO: Add status to estimate schema if needed
                total_amount: item.total_amount,
                is_baseline: item.is_baseline,
                company: item.company,
                created_at: item.created_at.toISOString()
            }))
        };
    }
}));
