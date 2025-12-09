import { Project } from '~/server/models';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);

  try {
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updatedProject) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found',
      });
    }

    return updatedProject;
  } catch (error: any) {
    if (error.code === 11000) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Project code already exists',
      });
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Error updating project',
      cause: error,
    });
  }
});
