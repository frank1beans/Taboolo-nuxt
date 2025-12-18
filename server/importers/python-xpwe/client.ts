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
const xpweFieldMap = (name: string) => {
    if (name === 'estimate_id') return 'estimate_id'; // XPWE might use estimate_id directly or handle it internally
    return name;
};

export async function previewXpweImport(event: H3Event, projectId?: string) {
    const id = assertProjectId(projectId);
    const result = await proxyMultipartToPython(
        event,
        `/commesse/${id}/import-xpwe/preview`,
        { method: 'POST' }
    );
    return mapSixPreview(result);
}

export async function runXpweImport(event: H3Event, projectId?: string) {
    const id = assertProjectId(projectId);
    const result = await proxyMultipartToPython(
        event,
        `/commesse/${id}/import-xpwe`,
        { method: 'POST', mapFieldName: xpweFieldMap }
    );
    return mapSixImportReport(result);
}

export async function previewXpweImportRaw(event: H3Event, projectId?: string) {
    const id = assertProjectId(projectId);
    const result = await proxyMultipartToPython(
        event,
        `/commesse/${id}/import-xpwe/raw/preview`,
        { method: 'POST' }
    );
    console.log('[Nitro DEBUG] XPWE Raw Preview Result from Python:', JSON.stringify(result, null, 2));
    return mapRawPreview(result);
}

export async function runXpweImportRaw(event: H3Event, projectId?: string): Promise<RawImportPayload> {
    const id = assertProjectId(projectId);
    const result = await proxyMultipartToPython(
        event,
        `/commesse/${id}/import-xpwe/raw`,
        { method: 'POST', mapFieldName: xpweFieldMap }
    );
    return mapRawImportPayload(result);
}
