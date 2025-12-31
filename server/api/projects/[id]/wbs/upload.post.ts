import { defineEventHandler, getQuery } from 'h3';
import { proxyMultipartToPython } from '#utils/python-proxy';
import { mapWbsImportStats } from '#utils/python-mappers';
import { requireObjectIdParam } from '#utils/validate';

export default defineEventHandler(async (event) => {
  const projectId = requireObjectIdParam(event, 'id', 'Project ID');

  const query = getQuery(event);
  const method = (query.mode === 'update' || event.node.req.method === 'PUT') ? 'PUT' : 'POST';

  const result = await proxyMultipartToPython(event, `/commesse/${projectId}/wbs/upload`, { method });
  return mapWbsImportStats(result);
});
