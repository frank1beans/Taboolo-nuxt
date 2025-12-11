import { PriceCatalogItem } from '~/server/models';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  try {
    const items = await PriceCatalogItem.find({ project_id: projectId }).sort({ created_at: -1 });
    return { items };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching price catalog',
      cause: error,
    });
  }
});
