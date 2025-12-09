import { proxyMultipartToPython } from '~/server/utils/python-proxy';
import { mapSixPreview } from '~/server/utils/python-mappers';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  const result = await proxyMultipartToPython(
    event,
    `/commesse/${projectId}/import-six/preview`,
    { method: 'POST' }
  );

  return mapSixPreview(result);
});
