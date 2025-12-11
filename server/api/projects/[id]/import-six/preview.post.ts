import { previewSixImport } from '#importers/python-six/client';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  return previewSixImport(event, projectId);
});
