import { proxyMultipartToPython } from '~/server/utils/python-proxy';
import { mapBatchSingleFileResult } from '~/server/utils/python-mappers';

const fieldMap = (name: string) => {
  if (name === 'companies_config') return 'imprese_config';
  if (name === 'progressive_column') return 'progressive_column';
  if (name === 'code_columns') return 'code_columns';
  if (name === 'description_columns') return 'description_columns';
  if (name === 'sheet_name') return 'sheet_name';
  if (name === 'mode') return 'mode';
  return name;
};

const valueMap = (name: string, value: string) => {
  if (name === 'code_columns' || name === 'description_columns') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.join(',');
    } catch {
      // ignore
    }
  }
  return value;
};

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  const result = await proxyMultipartToPython(
    event,
    `/commesse/${projectId}/ritorni/batch-single-file`,
    { method: 'POST', mapFieldName: fieldMap, mapFieldValue: valueMap }
  );

  return mapBatchSingleFileResult(result);
});
