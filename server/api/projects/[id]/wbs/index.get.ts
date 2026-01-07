import { defineEventHandler, createError } from 'h3';
import { serializeDocs } from '#utils/serialize';
import { listWbsNodes } from '#services/WbsService';
import { requireObjectIdParam, requireObjectIdQuery } from '#utils/validate';

export default defineEventHandler(async (event) => {
  const projectId = requireObjectIdParam(event, 'id', 'Project ID');
  const estimateId = requireObjectIdQuery(event, 'estimate_id', 'Estimate ID');

  try {
    // The original WbsNode.find filters by project_id and estimate_id.
    // Assuming listWbsNodes takes these as direct arguments or in an options object.
    // The provided snippet for listWbsNodes includes 'level' and 'parent_id' which are not defined in this context.
    // To make the change faithfully without introducing undefined variables or unrelated edits,
    // we will call listWbsNodes with the parameters that are available and relevant to the original query.
    // If listWbsNodes is expected to return a Mongoose query, .lean() would still apply.
    // If listWbsNodes returns an array directly, .lean() should be removed.
    // Given the instruction includes `.lean()` at the end of the `listWbsNodes` call,
    // we will assume `listWbsNodes` returns a query-like object that supports `.lean()`.
    // The `level` and `parent_id` parameters from the instruction are omitted as they are not defined in the current scope.
    const nodes = await listWbsNodes(projectId, estimateId).catch(err => {
      // Fallback or rethrow
      throw err;
    });

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
