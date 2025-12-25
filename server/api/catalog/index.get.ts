import { defineEventHandler, getQuery } from 'h3';
import mongoose, { type PipelineStage } from 'mongoose';
import { PriceListItem } from '#models';
import { serializeDocs } from '#utils/serialize';

export default defineEventHandler(async (event) => {
  const queryParams = getQuery(event);
  const filters: Record<string, unknown> = {};

  if (queryParams.search) {
    const regex = new RegExp(String(queryParams.search), 'i');
    filters.$or = [
      { code: regex },
      { description: regex },
      { long_description: regex },
      { extended_description: regex },
    ];
  }

  if (queryParams.project_id) {
    const projectId = String(queryParams.project_id);
    if (mongoose.Types.ObjectId.isValid(projectId)) {
      filters.project_id = new mongoose.Types.ObjectId(projectId);
    } else {
      filters.project_id = projectId;
    }
  }

  const pipeline: PipelineStage[] = [];
  if (Object.keys(filters).length) {
    pipeline.push({ $match: filters });
  }

  pipeline.push(
    {
      $lookup: {
        from: 'projects',
        localField: 'project_id',
        foreignField: '_id',
        as: 'project_doc',
      },
    },
    {
      $addFields: {
        project_doc: { $arrayElemAt: ['$project_doc', 0] },
        project_id: {
          $convert: {
            input: '$project_id',
            to: 'string',
            onError: null,
            onNull: null,
          },
        },
      },
    },
    {
      $addFields: {
        project_name: '$project_doc.name',
        project_code: '$project_doc.code',
        business_unit: '$project_doc.business_unit',
      },
    },
  );

  if (queryParams.business_unit) {
    pipeline.push({
      $match: { business_unit: String(queryParams.business_unit) },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: 'wbsnodes',
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
    {
      $project: {
        wbs_nodes: 0,
        wbs6_node: 0,
        wbs7_node: 0,
        project_doc: 0,
      },
    },
  );

  const items = await PriceListItem.aggregate(pipeline, { allowDiskUse: true });
  return serializeDocs(items);
});
