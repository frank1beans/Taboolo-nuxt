import { defineEventHandler } from 'h3';
import { EstimateItem, Offer } from '#models';
import { requireObjectIdParam, requireObjectIdQuery, toObjectId } from '#utils/validate';

export default defineEventHandler(async (event) => {
  const projectId = requireObjectIdParam(event, 'id', 'Project ID');
  const projectObjectId = toObjectId(projectId);
  const estimateId = requireObjectIdQuery(event, 'estimate_id', 'Estimate ID');
  const estimateObjectId = toObjectId(estimateId);

  // 1. Calculate Baseline Total (Project Estimate)
  // We need to support calculated fields if not stored directly
  const [baselineAgg] = await EstimateItem.aggregate([
    { $match: { project_id: projectObjectId, 'project.estimate_id': estimateObjectId } },
    { $addFields: { pli_oid: { $toObjectId: "$price_list_item_id" } } },
    {
      $lookup: {
        from: 'pricelistitems',
        localField: 'pli_oid',
        foreignField: '_id',
        as: 'price_item'
      }
    },
    { $unwind: { path: '$price_item', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        'project.amount': {
          $cond: {
            if: { $gt: ['$project.amount', null] },
            then: '$project.amount',
            else: { $multiply: ['$project.quantity', { $ifNull: ['$price_item.price', 0] }] }
          }
        }
      }
    },
    { $group: { _id: null, total: { $sum: '$project.amount' } } }
  ]);

  // 2. Fetch Offers (Total Amounts)
  // Since we store total_amount in Offer header, we can just query offers linked to this baseline
  const offers = await Offer.find({
    project_id: projectObjectId,
    estimate_id: estimateObjectId
  }).lean();

  const roundMap = new Map<number, { totals: Record<string, number> }>();

  for (const offer of offers) {
    const round = offer.round_number || 1;
    if (!roundMap.has(round)) roundMap.set(round, { totals: {} });

    const companyKey = offer.company_name;
    const amount = offer.total_amount || 0;

    roundMap.get(round)!.totals[companyKey] = amount;
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
