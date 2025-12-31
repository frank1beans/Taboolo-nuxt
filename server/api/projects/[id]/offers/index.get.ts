import { defineEventHandler, createError, getQuery } from 'h3';
import { Offer } from '#models';
import { serializeDocs } from '#utils/serialize';
import { requireObjectId, requireObjectIdParam, toObjectId } from '#utils/validate';

export default defineEventHandler(async (event) => {
    const projectId = requireObjectIdParam(event, 'id', 'Project ID');
    const query = getQuery(event);
    const estimateId = query.estimate_id as string | undefined;

    try {
        const filter: Record<string, unknown> = { project_id: toObjectId(projectId) };

        if (estimateId) {
            filter.estimate_id = toObjectId(requireObjectId(estimateId, 'Estimate ID'));
        }

        const offers = await Offer.find(filter)
            .select('_id estimate_id round_number company_name name status total_amount mode')
            .sort({ round_number: 1, company_name: 1 })
            .lean();

        const serialized = serializeDocs(offers).map((offer) => ({
            ...offer,
            estimate_id: offer.estimate_id ? String(offer.estimate_id) : undefined,
        }));

        return {
            offers: serialized,
        };
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Error fetching offers',
            cause: error,
        });
    }
});
