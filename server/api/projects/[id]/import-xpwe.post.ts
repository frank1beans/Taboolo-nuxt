import { defineEventHandler, createError, getQuery } from 'h3';
import { Types } from 'mongoose';
import { runXpweImportRaw } from '#importers/python-xpwe/client';
import { requireObjectIdParam } from '#utils/validate';

type RawImportPayload = {
    estimate?: unknown;
    units?: unknown[];
    priceLists?: unknown[];
    [key: string]: unknown;
};

export default defineEventHandler(async (event) => {
    const projectId = requireObjectIdParam(event, 'id', 'Project ID');
    const query = getQuery(event);
    const isRaw = query?.mode === 'raw' || query?.raw === 'true' || query?.raw === '1';

    if (isRaw) {
        const importId = new Types.ObjectId();
        console.log(`[ImportXPWE] Starting Raw Import ${importId} for Project ${projectId}`);

        const payload = await runXpweImportRaw(event, projectId) as RawImportPayload;

        if (payload.estimate) {
            // Use Persistence Service
            const { persistImportResult } = await import('#services/ImportPersistenceService');
            const result = await persistImportResult(payload, projectId);
            return result;
        }

        // Fallback for unexpected payloads
        console.log(`[ImportXPWE] Invalid Payload received:`, {
            keys: Object.keys(payload)
        });

        throw createError({ statusCode: 500, statusMessage: 'Invalid XPWE Import Payload' });
    }

    // Legacy mode is not supported for XPWE
    throw createError({ statusCode: 400, statusMessage: 'Legacy XPWE import is not supported. Use Raw mode.' });
});
