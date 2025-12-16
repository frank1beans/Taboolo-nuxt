import type { H3Event } from 'h3';
import { createError } from 'h3';
import { proxyMultipartToPython } from '#utils/python-proxy';
import { mapSixImportReport, mapSixPreview, mapRawImportPayload, mapRawPreview } from '#utils/python-mappers';
import type { RawImportPayload } from '#utils/raw-types';

const assertProjectId = (projectId?: string): string => {
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }
  return projectId;
};

// Map frontend field names to the python importer expectations
const sixFieldMap = (name: string) => {
  if (name === 'estimate_id') return 'preventivo_id';
  if (name === 'compute_embeddings') return 'compute_embeddings';
  if (name === 'extract_properties') return 'extract_properties';
  return name;
};

export async function previewSixImport(event: H3Event, projectId?: string) {
  const id = assertProjectId(projectId);
  const result = await proxyMultipartToPython(
    event,
    `/commesse/${id}/import-six/preview`,
    { method: 'POST' }
  );
  return mapSixPreview(result);
}

export async function runSixImport(event: H3Event, projectId?: string) {
  const id = assertProjectId(projectId);
  const result = await proxyMultipartToPython(
    event,
    `/commesse/${id}/import-six`,
    { method: 'POST', mapFieldName: sixFieldMap }
  );
  return mapSixImportReport(result);
}

export async function previewSixImportRaw(event: H3Event, projectId?: string) {
  const id = assertProjectId(projectId);
  const result = await proxyMultipartToPython(
    event,
    `/commesse/${id}/import-six/raw/preview`,
    { method: 'POST' }
  );
  console.log('[Nitro DEBUG] Raw Preview Result from Python:', JSON.stringify(result, null, 2));
  return mapRawPreview(result);
}

export async function runSixImportRaw(event: H3Event, projectId?: string): Promise<RawImportPayload> {
  const id = assertProjectId(projectId);
  const result = await proxyMultipartToPython(
    event,
    `/commesse/${id}/import-six/raw`,
    { method: 'POST', mapFieldName: sixFieldMap }
  );
  return mapRawImportPayload(result);
}

