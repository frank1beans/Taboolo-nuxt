import { defineEventHandler, createError, getRouterParam } from 'h3';
import { proxyMultipartToPython } from '#utils/python-proxy';
import { mapComputoToEstimate } from '#utils/python-mappers';
import { upsertEstimate } from '#utils/import-adapter';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  // Delega all'importer Python (computo progetto Excel/SIX)
  const result = await proxyMultipartToPython(event, `/commesse/${projectId}/computo-progetto`, { method: 'POST' });
  const mapped = mapComputoToEstimate(result);

  // Persist estimate in Mongo (baseline/project)
  const saved = await upsertEstimate(projectId, {
    ...mapped,
    type: 'project',
    is_baseline: mapped?.is_baseline ?? true,
  });

  return saved;
});



