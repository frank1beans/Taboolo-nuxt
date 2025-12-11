import { proxyMultipartToPython } from '~/server/utils/python-proxy';
import { mapComputoToEstimate } from '~/server/utils/python-mappers';
import { upsertEstimate } from '~/server/utils/import-adapter';

const fieldMap = (name: string) => {
  switch (name) {
    case 'company':
      return 'impresa';
    case 'price_column':
      return 'price_column';
    case 'quantity_column':
      return 'quantity_column';
    case 'progressive_column':
      return 'progressive_column';
    case 'round_number':
      return 'round_number';
    case 'round_mode':
      return 'round_mode';
    case 'discipline':
      return 'disciplina';
    default:
      return name;
  }
};

const valueMap = (name: string, value: string) => {
  if (name === 'code_columns' || name === 'description_columns') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.join(',');
    } catch {
      // fallback: return as-is
    }
  }
  return value;
};

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  // Proxy all offer imports (LC/MC) to Python importer
  const result = await proxyMultipartToPython(event, `/commesse/${projectId}/ritorni`, { method: 'POST', mapFieldName: fieldMap, mapFieldValue: valueMap });
  const mapped = mapComputoToEstimate(result);

  // Persist estimate in Mongo (offer)
  const saved = await upsertEstimate(projectId, {
    ...mapped,
    type: 'offer',
  });

  return saved;
});
