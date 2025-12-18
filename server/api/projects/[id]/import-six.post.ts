import { defineEventHandler, createError, getQuery, getRouterParam } from 'h3';
import { Types } from 'mongoose';
import { runSixImportRaw } from '#importers/python-six/client';

type RawImportPayload = {
  estimate?: unknown;
  units?: unknown[];
  priceLists?: unknown[];
  [key: string]: unknown;
};

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }
  const query = getQuery(event);
  const isRaw = query?.mode === 'raw' || query?.raw === 'true' || query?.raw === '1';

  if (isRaw) {
    const importId = new Types.ObjectId();
    console.log(`[ImportSIX] Starting Raw Import ${importId} for Project ${projectId}`);

    const payload = await runSixImportRaw(event, projectId) as RawImportPayload;

    // Legacy legacy or new format check
    // If payload has 'estimate', it's the new format
    if (payload.estimate) {
      // Use new Persistence Service
      const { persistImportResult } = await import('#services/ImportPersistenceService');
      const result = await persistImportResult(payload, projectId);
      return result;
    }

    // Fallback for transitional legacy payloads (if any)
    console.log(`[ImportSIX] Payload received (Legacy?):`, {
      units: payload.units?.length,
      lists: payload.priceLists?.length,
    });

    // We don't support legacy here anymore, so just return empty or error
    return {
      preventivi: [],
      message: "Legacy payload ignored"
    };
  }

  // Legacy mode is no longer supported for SIX files
  throw createError({ statusCode: 400, statusMessage: 'Legacy SIX import is deprecated. Use Raw mode.' });
});
