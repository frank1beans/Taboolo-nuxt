import { defineEventHandler, getQuery, getRouterParam } from 'h3';
import { previewXpweImport, previewXpweImportRaw } from '#importers/python-xpwe/client';

export default defineEventHandler(async (event) => {
    const projectId = getRouterParam(event, 'id');
    const query = getQuery(event);
    const isRaw = query?.mode === 'raw' || query?.raw === 'true' || query?.raw === '1';
    if (isRaw) {
        return previewXpweImportRaw(event, projectId);
    }
    return previewXpweImport(event, projectId);
});
