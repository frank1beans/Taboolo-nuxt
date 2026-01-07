import { defineEventHandler, createError } from 'h3';
import { buildProjectContext } from './context.get';
import { requireObjectIdParam } from '#utils/validate';

export default defineEventHandler(async (event) => {
  const projectObjectId = requireObjectIdParam(event, 'id', 'Project ID');

  try {
    const context = await buildProjectContext(projectObjectId);
    return context.estimates ?? [];
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching estimates',
      cause: error,
    });
  }
});
