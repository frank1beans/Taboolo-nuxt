import { defineEventHandler, createError } from 'h3';
import { getProjectOverview } from '#services/ProjectService';
import { requireObjectIdParam } from '#utils/validate';

export default defineEventHandler(async (event) => {
  const id = requireObjectIdParam(event, 'id', 'Project ID');

  try {
    const projectOverview = await getProjectOverview(id);

    if (!projectOverview) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found',
      });
    }

    return projectOverview;
  } catch (error: any) {
    if (error.statusCode === 404) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching project details',
      cause: error,
    });
  }
});
