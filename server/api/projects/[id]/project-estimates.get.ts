import { Estimate } from '~/server/models';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  try {
    const estimates = await Estimate.find({ project_id: projectId }).sort({ created_at: -1 });
    return estimates;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching estimates',
      cause: error,
    });
  }
});


