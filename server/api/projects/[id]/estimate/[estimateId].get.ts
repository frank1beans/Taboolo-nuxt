import { defineEventHandler, createError, getRouterParam } from 'h3';
import { Estimate } from '#models';
import { serializeDoc } from '#utils/serialize';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  const estimateId = getRouterParam(event, 'estimateId');

  if (!projectId || !estimateId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID and Estimate ID required' });
  }

  try {
    const estimate = await Estimate.findOne({ _id: estimateId, project_id: projectId }).lean();

    if (!estimate) {
      throw createError({ statusCode: 404, statusMessage: 'Estimate not found' });
    }

    return serializeDoc(estimate);
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching estimate',
      cause: error,
    });
  }
});




