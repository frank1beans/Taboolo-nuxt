import { defineEventHandler, getQuery, getRouterParam } from 'h3';
import { previewSixImport, previewSixImportRaw } from '#importers/python-six/client';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  const query = getQuery(event);
  const isRaw = query?.mode === 'raw' || query?.raw === 'true' || query?.raw === '1';
  if (isRaw) {
    return previewSixImportRaw(event, projectId);
  }
  return previewSixImport(event, projectId);
});
