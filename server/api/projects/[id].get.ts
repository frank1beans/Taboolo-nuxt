import { Project, Estimate } from '#models';

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

    // Fetch associated estimates
    const estimates = await Estimate.find({ project_id: id }).sort({ created_at: -1 });

    return {
      ...project.toObject(),
      estimates: estimates,
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching project details',
      cause: error,
    });
  }
});
