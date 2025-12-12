import { defineEventHandler, createError, getRouterParam, readBody } from 'h3';
import { Project } from '#models';
import { serializeDoc } from '#utils/serialize';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);

  try {
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedProject) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found',
      });
    }

    return serializeDoc(updatedProject);
  } catch (error: unknown) {
    const isDuplicateKey =
      typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000;

    if (isDuplicateKey) {
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
