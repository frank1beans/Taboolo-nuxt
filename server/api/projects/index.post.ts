import { Project } from '~/server/models';

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
    return newProject;
  } catch (error: any) {
    if (error.code === 11000) {
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
