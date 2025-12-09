import { proxyMultipartToPython } from '~/server/utils/python-proxy';
import { mapSixImportReport } from '~/server/utils/python-mappers';

const fieldMap = (name: string) => {
  if (name === 'estimate_id') return 'preventivo_id';
  if (name === 'compute_embeddings') return 'compute_embeddings';
  if (name === 'extract_properties') return 'extract_properties';
  return name;
};

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  const result = await proxyMultipartToPython(
    event,
    `/commesse/${projectId}/import-six`,
    { method: 'POST', mapFieldName: fieldMap }
  );

  return mapSixImportReport(result);
});
