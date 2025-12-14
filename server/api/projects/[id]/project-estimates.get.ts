import { defineEventHandler, createError, getRouterParam } from 'h3';
import { Estimate } from '#models';
import { serializeDocs } from '#utils/serialize';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  try {
    const estimates = await Estimate.find({ project_id: projectId }).sort({ created_at: -1 }).lean();
    return serializeDocs(estimates);
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching estimates',
      cause: error,
    });
  }
});




