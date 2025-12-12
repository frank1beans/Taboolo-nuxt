import { defineEventHandler, createError, readBody } from 'h3';
import { Project } from '#models';
import { serializeDoc } from '#utils/serialize';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body.name || !body.code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Name and Code are required',
    });
  }

  try {
    const newProject = await Project.create(body);
    return serializeDoc(newProject.toObject());
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
      statusMessage: 'Error creating project',
      cause: error,
    });
  }
});
