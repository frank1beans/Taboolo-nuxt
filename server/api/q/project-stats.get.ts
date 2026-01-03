import { QueryKeys } from '~/types/queries';
import { createQueryHandler, defineQuery } from '#utils/registry';
import { Estimate } from '#models/estimate.schema';

export default createQueryHandler(defineQuery({
    id: QueryKeys.PROJECT_STATS,
    scope: 'public',
    handler: async (event, args) => {
        const { id } = args; // project_id

        const estimates = await Estimate.find({ project_id: id }).lean();

        const stats = {
            total_estimates: 0,
            total_offers: 0,
            baseline_amount: 0
        };

        for (const est of estimates) {
            if (est.type === 'project') {
                stats.total_estimates++;
                if (est.is_baseline) {
                    stats.baseline_amount = est.total_amount || 0;
                }
            } else {
                stats.total_offers++;
            }
        }

        return stats;
    }
}));
