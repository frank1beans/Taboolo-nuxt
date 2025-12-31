import { defineEventHandler, createError } from 'h3';
import { Estimate } from '#models';
import { deleteEstimateCascade } from '#services/EstimateService';
import { requireObjectIdParam, toObjectId } from '#utils/validate';

export default defineEventHandler(async (event) => {
    const projectId = requireObjectIdParam(event, 'id', 'Project ID');
    const estimateId = requireObjectIdParam(event, 'estimateId', 'Estimate ID');

    const projectObjectId = toObjectId(projectId);
    const estimateObjectId = toObjectId(estimateId);

    try {
        const estimate = await Estimate.findOne({ _id: estimateObjectId, project_id: projectObjectId });
        if (!estimate) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Estimate not found',
            });
        }

        console.log(`[API] Deleting estimate ${estimateId} for project ${projectId}`);
        const result = await deleteEstimateCascade(projectObjectId.toString(), estimateObjectId.toString());
        console.log(`[API] Deletion result:`, result);

        return {
            success: true,
            ...result,
            message: 'Estimate deleted',
        };
    } catch (error: unknown) {
        const err = error as Record<string, unknown>;
        throw createError({
            statusCode: typeof err.statusCode === 'number' ? err.statusCode : 500,
            statusMessage: typeof err.statusMessage === 'string' ? err.statusMessage : 'Error deleting estimate',
            data: err.data,
        });
    }
});
