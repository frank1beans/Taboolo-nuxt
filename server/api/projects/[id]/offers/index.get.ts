
import { defineEventHandler, createError, getRouterParam, getQuery } from 'h3';
import { Offer } from '#models';
import mongoose from 'mongoose';

export default defineEventHandler(async (event) => {
    const projectId = getRouterParam(event, 'id');
    const query = getQuery(event);
    const estimateId = query.estimate_id;

    if (!projectId) {
        throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
    }

    const filter: Record<string, any> = {
        project_id: projectId
    };

    if (estimateId) {
        filter.estimate_id = estimateId;
    }

    const offers = await Offer.find(filter).select('_id company_name round_number estimate_id total_amount').lean();
    return { offers };
});
