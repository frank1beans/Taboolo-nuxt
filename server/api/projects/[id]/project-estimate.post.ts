import { defineEventHandler } from 'h3';
import { proxyMultipartToPython } from '#utils/python-proxy';
import { mapComputoToEstimate } from '#utils/python-mappers';
import { upsertEstimate } from '#utils/import-adapter';
import { requireObjectIdParam } from '#utils/validate';

export default defineEventHandler(async (event) => {
  const projectId = requireObjectIdParam(event, 'id', 'Project ID');

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





