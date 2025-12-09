import { Project, WbsNode } from '~/server/models';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');

  try {
    const nodes = await WbsNode.find({ project_id: projectId });
    
    const spatial = nodes.filter(n => n.type === 'spatial');
    const wbs6 = nodes.filter(n => n.type === 'wbs6');
    const wbs7 = nodes.filter(n => n.type === 'wbs7');

    return {
      project_id: projectId,
      spatial,
      wbs6,
      wbs7,
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching WBS structure',
      cause: error,
    });
  }
});
