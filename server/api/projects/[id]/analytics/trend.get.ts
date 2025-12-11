import { Types } from 'mongoose';
import { Item } from '#models';

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

  const [baselineAgg] = await Item.aggregate([
    { $match: { project_id: projectObjectId } },
    { $group: { _id: null, total: { $sum: projectAmountExpr } } }
  ]);

  const offerAgg = await Item.aggregate([
    { $match: { project_id: projectObjectId } },
    { $unwind: '$offers' },
    {
      $group: {
        _id: { company: '$offers.company', round: { $ifNull: ['$offers.round_number', 1] } },
        total_amount: { $sum: offerAmountExpr }
      }
    },
    {
      $project: {
        _id: 0,
        company: '$_id.company',
        round_number: '$_id.round',
        total_amount: 1
      }
    },
    { $sort: { round_number: 1, company: 1 } }
  ]);

  const roundMap = new Map<number, { totals: Record<string, number> }>();
  for (const row of offerAgg) {
    const round = row.round_number || 1;
    if (!roundMap.has(round)) roundMap.set(round, { totals: {} });
    roundMap.get(round)!.totals[row.company || ''] = row.total_amount || 0;
  }

  const rounds = Array.from(roundMap.entries()).sort(([a], [b]) => a - b).map(([round, data]) => {
    const values = Object.values(data.totals);
    const average = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    return {
      round_number: round,
      totals_by_company: data.totals,
      average
    };
  });

  return {
    project_total: baselineAgg?.total || 0,
    rounds
  };
});
