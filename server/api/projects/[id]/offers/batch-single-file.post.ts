import { defineEventHandler } from 'h3';
import { proxyMultipartToPython } from '#utils/python-proxy';
import { mapBatchSingleFileResult } from '#utils/python-mappers';
import { persistOffer } from '#services/ImportPersistenceService';
import { requireObjectIdParam } from '#utils/validate';

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
  const projectId = requireObjectIdParam(event, 'id', 'Project ID');

  const result = await proxyMultipartToPython(
    event,
    `/commesse/${projectId}/ritorni/batch-single-file`,
    { method: 'POST', mapFieldName: fieldMap, mapFieldValue: valueMap }
  );

  const mapped = mapBatchSingleFileResult(result);

  // Persist all returned offers (headers + items) using existing offer pipeline
  const estimatesArray = mapped.estimates ? Object.values(mapped.estimates) : [];
  for (const est of estimatesArray) {
    const payload = {
      project: {},
      groups: [],
      price_list: {},
      estimate: {
        ...est,
        type: 'offer',
        mode: est.mode || result?.mode || 'aggregated',
      },
    };
    await persistOffer(payload, projectId);
  }

  return mapped;
});
