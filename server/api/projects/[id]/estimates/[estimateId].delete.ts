import { defineEventHandler, createError, getRouterParam } from 'h3';
import { Types } from 'mongoose';
import { Estimate } from '#models';
import { deleteEstimateCascade } from '#services/EstimateService';

export default defineEventHandler(async (event) => {
    const projectId = getRouterParam(event, 'id');
    const estimateId = getRouterParam(event, 'estimateId');

    if (!projectId || !estimateId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Project ID and Estimate ID are required',
        });
    }

    const projectObjectId = new Types.ObjectId(projectId);
    const estimateObjectId = new Types.ObjectId(estimateId);

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
