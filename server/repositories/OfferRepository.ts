
import { Offer, type IOffer, OfferItem } from '#models';
import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';

/**
 * Repository for Offer data access.
 */
export const OfferRepository = {
    /**
     * Find offers by criteria
     */
    async find(criteria: { project_id?: string; estimate_id?: string }, session?: ClientSession): Promise<IOffer[]> {
        const query: Record<string, unknown> = {};
        if (criteria.project_id) query.project_id = new Types.ObjectId(criteria.project_id);
        if (criteria.estimate_id) query.estimate_id = new Types.ObjectId(criteria.estimate_id);

        return Offer.find(query, null, { session }).lean();
    },

    /**
     * Delete offers matching criteria
     */
    async deleteMany(criteria: { project_id?: string; estimate_id?: string }, session?: ClientSession) {
        const query: Record<string, unknown> = {};
        if (criteria.project_id) query.project_id = new Types.ObjectId(criteria.project_id);
        if (criteria.estimate_id) query.estimate_id = new Types.ObjectId(criteria.estimate_id);

        return Offer.deleteMany(query, { session });
    },

    /**
     * Delete offer items related to a set of offer IDs
     */
    async deleteItemsByOfferIds(offerIds: string[], session?: ClientSession) {
        if (!offerIds.length) return { deletedCount: 0 };
        return OfferItem.deleteMany({ offer_id: { $in: offerIds } }, { session });
    },

    /**
     * Update an offer by ID.
     */
    async update(id: string, data: Partial<IOffer>, projectId?: string, session?: ClientSession): Promise<IOffer | null> {
        const query: Record<string, unknown> = { _id: new Types.ObjectId(id) };
        if (projectId) query.project_id = new Types.ObjectId(projectId);

        return Offer.findOneAndUpdate(query, { $set: data }, { new: true, session }).lean();
    },

    /**
     * Find offer by ID
     */
    async findById(id: string): Promise<IOffer | null> {
        if (!Types.ObjectId.isValid(id)) return null;
        return Offer.findById(id).lean();
    },

    /**
     * Create a new offer
     */
    async create(data: Partial<IOffer>): Promise<IOffer> {
        const doc = await Offer.create(data);
        return doc.toObject();
    },

    /**
     * Delete offer by ID
     */
    async delete(id: string, session?: ClientSession) {
        if (!Types.ObjectId.isValid(id)) return null;
        return Offer.findByIdAndDelete(id, { session });
    }
};
