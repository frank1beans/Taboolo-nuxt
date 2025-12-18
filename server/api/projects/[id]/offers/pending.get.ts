import { defineEventHandler, createError, getRouterParam, getQuery } from 'h3';
import { Types } from 'mongoose';
import { Offer, OfferItem } from '#models';
import { serializeDocs } from '#utils/serialize';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  const query = getQuery(event);
  const estimateId = query.estimate_id as string | undefined;
  const round = query.round ? Number(query.round) : undefined;
  const company = query.company as string | undefined;

  if (!estimateId) {
    throw createError({ statusCode: 400, statusMessage: 'estimate_id is required' });
  }

  const projectObjectId = new Types.ObjectId(projectId);
  const estimateObjectId = new Types.ObjectId(estimateId);

  // Find offers matching filters
  const offerMatch: any = {
    project_id: projectObjectId,
    estimate_id: estimateObjectId,
  };
  if (round !== undefined) offerMatch.round_number = round;
  if (company) offerMatch.company_name = company;

  const offers = await Offer.find(offerMatch).select('_id').lean();
  const offerIds = offers.map((o) => o._id);

  if (!offerIds.length) {
    return { items: [] };
  }

  // Aggregate pending offer items with candidate PLI details
  const items = await OfferItem.aggregate([
    {
      $match: {
        offer_id: { $in: offerIds },
        project_id: projectObjectId,
        resolution_status: 'pending',
      },
    },
    {
      $lookup: {
        from: 'pricelistitems',
        localField: 'candidate_price_list_item_ids',
        foreignField: '_id',
        as: 'candidates',
      },
    },
    {
      $project: {
        id: '$_id',
        description: 1,
        code: 1,
        quantity: 1,
        unit_price: 1,
        offer_id: 1,
        candidate_price_list_item_ids: 1,
        resolution_status: 1,
        candidates: {
          $map: {
            input: '$candidates',
            as: 'c',
            in: {
              id: '$$c._id',
              code: '$$c.code',
              description: '$$c.description',
              unit: '$$c.unit',
            },
          },
        },
        _id: 0,
      },
    },
  ]);

  return { items: serializeDocs(items) };
});
