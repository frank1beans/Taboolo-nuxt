import { defineEventHandler, getQuery } from 'h3';
import mongoose from 'mongoose';
import { PriceListItem, Project } from '#models';

export default defineEventHandler(async (event) => {
  const queryParams = getQuery(event);
  const match: Record<string, unknown> = {};

  if (queryParams.project_id) {
    const projectId = String(queryParams.project_id);
    if (mongoose.Types.ObjectId.isValid(projectId)) {
      match.project_id = new mongoose.Types.ObjectId(projectId);
    } else {
      match.project_id = projectId;
    }
  }

  if (queryParams.business_unit) {
    const projects = await Project.find({ business_unit: String(queryParams.business_unit) })
      .select('_id')
      .lean();
    if (!projects.length) return [];
    match.project_id = { $in: projects.map((p) => p._id) };
  }

  const pipeline = [
    { $match: match },
    { $project: { wbs_ids: 1 } },
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
      $project: {
        wbs6_code: '$wbs6_node.code',
        wbs6_description: '$wbs6_node.description',
        wbs7_code: '$wbs7_node.code',
        wbs7_description: '$wbs7_node.description',
      },
    },
    {
      $group: {
        _id: {
          wbs6_code: '$wbs6_code',
          wbs6_description: '$wbs6_description',
          wbs7_code: '$wbs7_code',
          wbs7_description: '$wbs7_description',
        },
      },
    },
    {
      $project: {
        _id: 0,
        wbs6_code: '$_id.wbs6_code',
        wbs6_description: '$_id.wbs6_description',
        wbs7_code: '$_id.wbs7_code',
        wbs7_description: '$_id.wbs7_description',
      },
    },
    { $sort: { wbs6_code: 1, wbs7_code: 1 } },
  ];

  return PriceListItem.aggregate(pipeline, { allowDiskUse: true });
});
