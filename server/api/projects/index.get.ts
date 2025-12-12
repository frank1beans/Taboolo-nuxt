import { defineEventHandler, createError } from 'h3';
import { Project } from '#models';
import { serializeDocs } from '#utils/serialize';

export default defineEventHandler(async (_event) => {
  try {
    const projects = await Project.find().sort({ created_at: -1 }).lean();
    return serializeDocs(projects);
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching projects',
      cause: error,
    });
  }
});
