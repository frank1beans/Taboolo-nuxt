import { Estimate } from '~/server/models';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  const estimateId = getRouterParam(event, 'estimateId');

  if (!projectId || !estimateId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID and Estimate ID required' });
  }

  try {
    const estimate = await Estimate.findOne({ _id: estimateId, project_id: projectId });
    
    if (!estimate) {
      throw createError({ statusCode: 404, statusMessage: 'Estimate not found' });
    }

    return estimate;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching estimate',
      cause: error,
    });
  }
});


