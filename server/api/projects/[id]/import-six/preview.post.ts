import { defineEventHandler, getQuery } from 'h3';
import { previewSixImport, previewSixImportRaw } from '#importers/python-six/client';
import { requireObjectIdParam } from '#utils/validate';

export default defineEventHandler(async (event) => {
  const projectId = requireObjectIdParam(event, 'id', 'Project ID');
  const query = getQuery(event);
  const isRaw = query?.mode === 'raw' || query?.raw === 'true' || query?.raw === '1';
  if (isRaw) {
    return previewSixImportRaw(event, projectId);
  }
  return previewSixImport(event, projectId);
});
