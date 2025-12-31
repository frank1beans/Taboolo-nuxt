import { WbsNode, type IWbsNode } from '#models';
import { Types } from 'mongoose';
import type { ClientSession, AnyBulkWriteOperation } from 'mongoose';

/**
 * Repository for WBS data access.
 * Encapsulates all Mongoose-specific logic for WBS Nodes.
 */
export const WbsRepository = {
    /**
     * Find WBS nodes by query
     */
    async find(query: Record<string, unknown>): Promise<IWbsNode[]> {
        return WbsNode.find(query).lean();
    },

    /**
     * Delete WBS nodes by criteria
     */
    async deleteMany(criteria: { project_id?: string; estimate_id?: string }, session?: ClientSession) {
        const query: Record<string, unknown> = {};
        if (criteria.project_id) query.project_id = new Types.ObjectId(criteria.project_id);
        if (criteria.estimate_id) query.estimate_id = new Types.ObjectId(criteria.estimate_id);

        return WbsNode.deleteMany(query, { session });
    },

    /**
     * Bulk upsert WBS nodes.
     * This encapsulates the complex logic of bulkWrite.
     */
    async bulkUpsert(ops: AnyBulkWriteOperation[], ordered: boolean = false) {
        if (!ops.length) return;
        return WbsNode.bulkWrite(ops, { ordered });
    },

    /**
     * Find nodes to build hierarchy maps.
     */
    async findForHierarchy(projectId: string, estimateId: string) {
        return WbsNode.find({
            project_id: new Types.ObjectId(projectId),
            estimate_id: new Types.ObjectId(estimateId)
        }).lean();
    }
};
