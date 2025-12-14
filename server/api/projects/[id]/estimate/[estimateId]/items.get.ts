import { defineEventHandler, createError, getRouterParam } from 'h3';
import { Item } from '#models';
import { serializeDocs } from '#utils/serialize';

export default defineEventHandler(async (event) => {
    const projectId = getRouterParam(event, 'id');
    const estimateId = getRouterParam(event, 'estimateId');

    if (!projectId || !estimateId) {
        throw createError({ statusCode: 400, statusMessage: 'Project ID and Estimate ID required' });
    }

    try {
        // Fetch items that belong to this project and have the specific estimate_id in their project data
        const items = await Item.find({
            project_id: projectId,
            'project.estimate_id': estimateId,
        })
            .sort({ order: 1 })
            .lean();

        return serializeDocs(items);
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Error fetching estimate items',
            cause: error,
        });
    }
});
