import { proxyMultipartToPython } from '~/server/utils/python-proxy';
import { mapComputoToEstimate } from '~/server/utils/python-mappers';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  // Delega all'importer Python (computo progetto Excel/SIX)
  const result = await proxyMultipartToPython(event, `/commesse/${projectId}/computo-progetto`, { method: 'POST' });
  return mapComputoToEstimate(result);
});

