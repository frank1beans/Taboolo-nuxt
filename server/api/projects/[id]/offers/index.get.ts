import { defineEventHandler, createError, getRouterParam, getQuery } from 'h3';
import { Types } from 'mongoose';
import { Offer } from '#models';
import { serializeDocs } from '#utils/serialize';

export default defineEventHandler(async (event) => {
    const projectId = getRouterParam(event, 'id');
    const query = getQuery(event);
    const estimateId = query.estimate_id as string | undefined;

    if (!projectId) {
        throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
    }

    try {
        const filter: Record<string, unknown> = { project_id: new Types.ObjectId(projectId) };

        if (estimateId) {
            filter.estimate_id = new Types.ObjectId(estimateId);
        }

        const offers = await Offer.find(filter)
            .select('_id round_number company_name name status total_amount mode')
            .sort({ round_number: 1, company_name: 1 })
            .lean();

        return {
            offers: serializeDocs(offers),
        };
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Error fetching offers',
            cause: error,
        });
    }
});
