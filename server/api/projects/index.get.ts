import { Project } from '~/server/models';

export default defineEventHandler(async (event) => {
  try {
    const projects = await Project.find().sort({ created_at: -1 });
    return projects;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching projects',
      cause: error,
    });
  }
});
