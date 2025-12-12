import { defineEventHandler, createError, getRouterParam } from 'h3';
import { Project, Estimate } from '#models';
import { serializeDoc, serializeDocs } from '#utils/serialize';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  try {
    const project = await Project.findById(id).lean();

    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found',
      });
    }

    // Fetch associated estimates
    const estimates = await Estimate.find({ project_id: id }).sort({ created_at: -1 }).lean();

    return {
      ...serializeDoc(project),
      estimates: serializeDocs(estimates),
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching project details',
      cause: error,
    });
  }
});
