import { defineEventHandler, createError, getQuery } from 'h3';
import { PriceListItem } from '#models';
import { serializeDocs } from '#utils/serialize';
import { requireObjectId, requireObjectIdParam, toObjectId } from '#utils/validate';

export default defineEventHandler(async (event) => {
  const projectId = requireObjectIdParam(event, 'id', 'Project ID');

  try {
    // Aggregation to join WBS nodes and extract Level 6 & 7
    const query: Record<string, unknown> = { project_id: toObjectId(projectId) };

    const queryParams = getQuery(event);
    const estimateId = queryParams.estimate_id?.toString();

    if (!estimateId) {
      throw createError({ statusCode: 400, statusMessage: 'Estimate ID required' });
    }
    query.estimate_id = toObjectId(requireObjectId(estimateId, 'Estimate ID'));

    const items = await PriceListItem.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'wbsnodes', // Verify collection name (Mongoose usually lowercases plural)
          localField: 'wbs_ids',
          foreignField: '_id',
          as: 'wbs_nodes',
        },
      },
      {
        $addFields: {
          wbs6_node: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$wbs_nodes',
                  as: 'node',
                  cond: { $eq: ['$$node.level', 6] },
                },
              },
              0,
            ],
          },
          wbs7_node: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$wbs_nodes',
                  as: 'node',
                  cond: { $eq: ['$$node.level', 7] },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $addFields: {
          wbs6_code: '$wbs6_node.code',
          wbs6_description: '$wbs6_node.description',
          wbs7_code: '$wbs7_node.code',
          wbs7_description: '$wbs7_node.description',
        },
      },
      { $project: { wbs_nodes: 0, wbs6_node: 0, wbs7_node: 0 } }, // Cleanup
      { $sort: { wbs6_code: 1, wbs7_code: 1, code: 1 } },
    ]);

    return { items: serializeDocs(items) };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching price catalog',
      cause: error,
    });
  }
});
