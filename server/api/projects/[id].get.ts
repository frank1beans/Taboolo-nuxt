import { defineEventHandler, createError } from 'h3';
import { buildProjectContext } from './[id]/context.get';
import { requireObjectIdParam } from '#utils/validate';

export default defineEventHandler(async (event) => {
  const id = requireObjectIdParam(event, 'id', 'Project ID');

  try {
    return await buildProjectContext(id);
  } catch (error: any) {
    if (error?.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching project details',
      cause: error,
    });
  }
});
