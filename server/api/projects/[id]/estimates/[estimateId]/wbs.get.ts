import { defineEventHandler, createError } from 'h3';
import { WbsNode } from '#models';
import { listWbsNodes } from '#services/WbsService';
import { serializeDocs } from '#utils/serialize';
import { requireObjectIdParam, toObjectId } from '#utils/validate';

export default defineEventHandler(async (event) => {
  const projectId = requireObjectIdParam(event, 'id', 'Project ID');
  const estimateId = requireObjectIdParam(event, 'estimateId', 'Estimate ID');

  try {
    // Use ObjectId for proper filtering
    const projectObjectId = toObjectId(projectId);
    const estimateObjectId = toObjectId(estimateId);
    const nodes = await listWbsNodes(projectId, estimateId);

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
