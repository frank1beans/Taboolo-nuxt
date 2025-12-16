import { defineEventHandler, createError, getRouterParam } from 'h3';
import { Types } from 'mongoose';
import { EstimateItem } from '#models'; // Updated import

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

  const [baselineAgg] = await EstimateItem.aggregate([
    { $match: { project_id: projectObjectId } },
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

  const offerAgg = await EstimateItem.aggregate([
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
