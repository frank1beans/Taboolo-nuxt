import { defineEventHandler, createError, getRouterParam } from 'h3';
import { Project, Estimate, WbsNode, EstimateItem, PriceListItem } from '#models';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  try {
    const project = await Project.findById(id);

    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found',
      });
    }

    // Cascade delete related entities
    await EstimateItem.deleteMany({ project_id: id });
    await WbsNode.deleteMany({ project_id: id }); // Updated key name in model
    await Estimate.deleteMany({ project_id: id });
    await PriceListItem.deleteMany({ project_id: id }); // Updated key name in model

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
