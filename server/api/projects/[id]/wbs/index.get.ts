import { WbsNode } from '#models';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');

  try {
    const nodes = await WbsNode.find({ project_id: projectId });
    
    const spatial = nodes.filter(n => n.type === 'spatial' || (n.level && n.level <= 5));
    const wbs6 = nodes.filter(n => n.level === 6);
    const wbs7 = nodes.filter(n => n.level === 7);

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
