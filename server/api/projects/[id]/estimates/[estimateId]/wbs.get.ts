import { defineEventHandler, createError, getRouterParam } from 'h3';
import { Types } from 'mongoose';
import { WbsNode } from '#models';
import { serializeDocs } from '#utils/serialize';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  const estimateId = getRouterParam(event, 'estimateId');

  if (!projectId || !estimateId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID and Estimate ID required' });
  }

  try {
    // Use ObjectId for proper filtering
    const projectObjectId = new Types.ObjectId(projectId);
    const estimateObjectId = new Types.ObjectId(estimateId);
    const nodes = await WbsNode.find({ project_id: projectObjectId, estimate_id: estimateObjectId }).lean();

    const spatial = nodes.filter(n => n.type === 'spatial' || (n.level && n.level <= 5));
    const wbs6 = nodes.filter(n => n.level === 6);
    const wbs7 = nodes.filter(n => n.level === 7);

    return {
      project_id: projectId,
      estimate_id: estimateId,
      spatial: serializeDocs(spatial),
      wbs6: serializeDocs(wbs6),
      wbs7: serializeDocs(wbs7),
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching WBS structure',
      cause: error,
    });
  }
});
