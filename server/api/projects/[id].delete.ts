import { defineEventHandler, createError } from 'h3';
import { Project, Estimate } from '#models';
import { deleteEstimateCascade } from '#services/EstimateService';
import { requireObjectIdParam, toObjectId } from '#utils/validate';

export default defineEventHandler(async (event) => {
  const id = requireObjectIdParam(event, 'id', 'Project ID');
  const projectObjectId = toObjectId(id);

  try {
    const project = await Project.findById(projectObjectId);

    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found',
      });
    }

    const estimates = await Estimate.find({ project_id: projectObjectId });
    for (const est of estimates) {
      await deleteEstimateCascade(id, est._id.toString());
    }
    await Project.findByIdAndDelete(projectObjectId);

    return { success: true };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error deleting project',
      cause: error,
    });
  }
});
