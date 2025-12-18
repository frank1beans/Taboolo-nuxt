import { defineEventHandler, createError, getRouterParam, getQuery } from 'h3';
import { Types } from 'mongoose';
import { EstimateItem, Offer } from '#models';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  const projectObjectId = new Types.ObjectId(projectId);
  const estimateId = getQuery(event).estimate_id?.toString();
  if (!estimateId) {
    throw createError({ statusCode: 400, statusMessage: 'Estimate ID required for analytics' });
  }
  const estimateObjectId = new Types.ObjectId(estimateId);

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

  // 2. Fetch Offers (Total Amounts) directly from Offer collection
  const offers = await Offer.find({
    project_id: projectObjectId,
    estimate_id: estimateObjectId
  }).lean();

  const offerAgg = offers.map(o => ({
    company: o.company_name,
    round_number: o.round_number || 1,
    total_amount: o.total_amount || 0
  })).sort((a, b) => a.round_number - b.round_number || a.company.localeCompare(b.company));

  const project_total = baselineAgg?.total || 0;

  const latestRound = offerAgg.reduce((max, o) => Math.max(max, o.round_number || 1), 0);
  const latestOffers = offerAgg.filter(o => o.round_number === latestRound);

  const average_offer_total = latestOffers.length
    ? latestOffers.reduce((sum, o) => sum + (o.total_amount || 0), 0) / latestOffers.length
    : 0;

  const delta_vs_project = average_offer_total - project_total;
  const delta_percentage = project_total ? (delta_vs_project / project_total) * 100 : null;

  return {
    project_total,
    offers: {
      latest_round: latestRound || null,
      per_company_round: offerAgg,
      average_offer_total,
      delta_vs_project,
      delta_percentage
    }
  };
});
