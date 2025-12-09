import { proxyMultipartToPython } from '~/server/utils/python-proxy';
import { mapWbsImportStats } from '~/server/utils/python-mappers';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  const query = getQuery(event);
  const method = (query.mode === 'update' || event.node.req.method === 'PUT') ? 'PUT' : 'POST';

  const result = await proxyMultipartToPython(event, `/commesse/${projectId}/wbs/upload`, { method });
  return mapWbsImportStats(result);
});
