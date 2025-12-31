
import { Estimate, type IEstimate } from '#models';
import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';

/**
 * Repository for Estimate data access.
 * Encapsulates all Mongoose-specific logic for Estimates.
 */
export const EstimateRepository = {
    /**
     * Find all estimates for a given project.
     */
    async findByProject(projectId: string): Promise<IEstimate[]> {
        return Estimate.find({ project_id: new Types.ObjectId(projectId) })
            .sort({ created_at: -1 })
            .lean();
    },

    /**
     * Find a single estimate by ID.
     */
    async findById(id: string): Promise<IEstimate | null> {
        return Estimate.findById(id).lean();
    },

    /**
     * Create or update an estimate.
     */
    async upsert(
        filter: { _id?: string },
        payload: Partial<IEstimate>,
        session?: ClientSession
    ): Promise<IEstimate> {
        const opts = { upsert: true, new: true, setDefaultsOnInsert: true, session };

        if (filter._id) {
            const updated = await Estimate.findByIdAndUpdate(filter._id, { $set: payload }, opts).lean();
            if (!updated) throw new Error(`Estimate with id ${filter._id} not found`);
            return updated as IEstimate;
        }

        // Create new
        const [created] = await Estimate.create([payload], { session });
        return created.toObject() as IEstimate;
    },

    /**
   * Delete an estimate by ID.
   */
    async deleteById(id: string, session?: ClientSession): Promise<{ deletedCount: number }> {
        const res = await Estimate.deleteOne({ _id: new Types.ObjectId(id) }, { session });
        return { deletedCount: res.deletedCount };
    }
};
