
import { EstimateItem, type IEstimateItem } from '#models';
import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';

export const EstimateItemRepository = {
    async deleteMany(criteria: { project_id?: string; estimate_id?: string }, session?: ClientSession) {
        const query: Record<string, unknown> = {};
        if (criteria.project_id) query.project_id = new Types.ObjectId(criteria.project_id);
        // Note: EstimateItem schema typically has 'project.estimate_id' for estimates?
        // Checking usage in EstimateService: 'project.estimate_id': estimateObjectId
        if (criteria.estimate_id) {
            query['project.estimate_id'] = new Types.ObjectId(criteria.estimate_id);
        }
        return EstimateItem.deleteMany(query, { session });
    },

    async insertMany(docs: unknown[], session?: ClientSession) {
        if (!docs.length) return;
        return EstimateItem.insertMany(docs, { ordered: false, session });
    }
};
