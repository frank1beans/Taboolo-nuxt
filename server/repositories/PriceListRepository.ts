
import { PriceList, PriceListItem, type IPriceList, type IPriceListItem } from '#models';
import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';

export const PriceListRepository = {
    async deleteLists(criteria: { project_id?: string; estimate_id?: string }, session?: ClientSession) {
        const query: Record<string, unknown> = {};
        if (criteria.project_id) query.project_id = new Types.ObjectId(criteria.project_id);
        if (criteria.estimate_id) query.estimate_id = new Types.ObjectId(criteria.estimate_id);
        return PriceList.deleteMany(query, { session });
    },

    async deleteItems(criteria: { project_id?: string; estimate_id?: string }, session?: ClientSession) {
        const query: Record<string, unknown> = {};
        if (criteria.project_id) query.project_id = new Types.ObjectId(criteria.project_id);
        if (criteria.estimate_id) query.estimate_id = new Types.ObjectId(criteria.estimate_id);
        return PriceListItem.deleteMany(query, { session });
    }
};
