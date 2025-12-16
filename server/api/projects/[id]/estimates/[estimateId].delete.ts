import { Estimate } from '../../../../models/estimate.schema';
import { EstimateItem } from '../../../../models/estimate-item.schema';
import { Project } from '../../../../models/project.schema';

export default defineEventHandler(async (event) => {
    const projectId = event.context.params?.id;
    const estimateId = event.context.params?.estimateId;

    if (!projectId || !estimateId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Project ID and Estimate ID are required',
        });
    }

    try {
        // 1. Check existence
        const estimate = await Estimate.findOne({ _id: estimateId, project_id: projectId });
        if (!estimate) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Estimate not found',
            });
        }

        // 2. Delete Items associated with this estimate
        // Accessing strict nested query property
        const deleteItemsResult = await EstimateItem.deleteMany({ 'project.estimate_id': estimateId });
        console.log(`[Delete Estimate] Deleted ${deleteItemsResult.deletedCount} items for estimate ${estimateId}`);

        // 3. Delete the Estimate itself
        await Estimate.findByIdAndDelete(estimateId);
        console.log(`[Delete Estimate] Deleted estimate ${estimateId}`);

        return {
            success: true,
            deletedItems: deleteItemsResult.deletedCount
        };

    } catch (error: any) {
        console.error('Error deleting estimate:', error);
        throw createError({
            statusCode: 500,
            statusMessage: error.message || 'Internal Server Error',
        });
    }
});
