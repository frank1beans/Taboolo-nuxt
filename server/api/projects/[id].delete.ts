import { defineEventHandler, createError, getRouterParam } from 'h3';
import { Project, Estimate } from '#models';
import { deleteEstimateCascade } from '#services/EstimateService';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  try {
    const project = await Project.findById(id);

    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found',
      });
    }

    const estimates = await Estimate.find({ project_id: id });
    for (const est of estimates) {
      await deleteEstimateCascade(id, est._id.toString());
    }
    await Project.findByIdAndDelete(id);

    return { success: true };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error deleting project',
      cause: error,
    });
  }
});
