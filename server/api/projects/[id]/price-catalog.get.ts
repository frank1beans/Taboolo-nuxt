import { defineEventHandler, createError, getRouterParam, getQuery } from 'h3';
import mongoose from 'mongoose';
import { PriceListItem } from '#models';
import { serializeDocs } from '#utils/serialize';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  try {
    // Aggregation to join WBS nodes and extract Level 6 & 7
    const query: Record<string, unknown> = { project_id: new mongoose.Types.ObjectId(projectId) };

  const queryParams = getQuery(event);
  const estimateId = queryParams.estimate_id?.toString();

  if (!estimateId) {
    throw createError({ statusCode: 400, statusMessage: 'Estimate ID required' });
  }
  query.estimate_id = new mongoose.Types.ObjectId(estimateId);

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
      { $sort: { created_at: -1 } },
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
