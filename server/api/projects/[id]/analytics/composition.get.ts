import { Types } from 'mongoose';
import { Item, WbsNode } from '~/server/models';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  const projectObjectId = new Types.ObjectId(projectId);

  const projectAmountExpr = {
    $ifNull: [
      '$project.amount',
      {
        $multiply: [
          { $ifNull: ['$project.quantity', 0] },
          { $ifNull: ['$project.unit_price', 0] }
        ]
      }
    ]
  };

  const offerAmountExpr = {
    $ifNull: [
      '$offers.amount',
      {
        $multiply: [
          { $ifNull: ['$offers.quantity', 0] },
          { $ifNull: ['$offers.unit_price', 0] }
        ]
      }
    ]
  };

  const wbs6Nodes = await WbsNode.find({ project_id: projectObjectId, level: 6 }).lean();
  const wbs6Map = new Map<string, { code: string; description?: string }>();
  for (const node of wbs6Nodes) {
    wbs6Map.set(String(node._id), { code: node.code, description: node.description });
  }

  const baselineAgg = await Item.aggregate([
    { $match: { project_id: projectObjectId } },
    {
      $group: {
        _id: '$wbs6_id',
        project_amount: { $sum: projectAmountExpr }
      }
    }
  ]);

  const offerAgg = await Item.aggregate([
    { $match: { project_id: projectObjectId } },
    { $unwind: '$offers' },
    {
      $group: {
        _id: { wbs6: '$wbs6_id', round: { $ifNull: ['$offers.round_number', 1] } },
        total_amount: { $sum: offerAmountExpr }
      }
    },
    {
      $project: {
        _id: 0,
        wbs6_id: '$_id.wbs6',
        round_number: '$_id.round',
        total_amount: 1
      }
    }
  ]);

  const latestRound = offerAgg.reduce((max, o) => Math.max(max, o.round_number || 1), 0);

  const composition = baselineAgg.map(entry => {
    const key = entry._id ? String(entry._id) : '';
    const meta = wbs6Map.get(key) || { code: 'UNK', description: 'Non assegnato' };
    const latestOffer = offerAgg
      .filter(o => String(o.wbs6_id) === key && o.round_number === latestRound)
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    return {
      wbs6_id: entry._id,
      code: meta.code,
      description: meta.description,
      project_amount: entry.project_amount || 0,
      latest_offer_amount: latestOffer
    };
  });

  return {
    latest_round: latestRound || null,
    composition
  };
});
