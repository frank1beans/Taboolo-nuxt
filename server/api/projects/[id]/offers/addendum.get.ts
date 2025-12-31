import { defineEventHandler, createError, getQuery } from 'h3';
import { Offer, OfferItem } from '#models';
import { serializeDocs } from '#utils/serialize';
import { requireObjectId, requireObjectIdParam, toObjectId } from '#utils/validate';

export default defineEventHandler(async (event) => {
  const projectId = requireObjectIdParam(event, 'id', 'Project ID');

  const query = getQuery(event);
  const estimateId = query.estimate_id as string | undefined;
  const round = query.round ? Number(query.round) : undefined;
  const company = query.company as string | undefined;

  if (!estimateId) {
    throw createError({ statusCode: 400, statusMessage: 'estimate_id is required' });
  }

  const projectObjectId = toObjectId(projectId);
  const estimateObjectId = toObjectId(requireObjectId(estimateId, 'Estimate ID'));

  const offerMatch: Record<string, unknown> = {
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

  const items = await OfferItem.aggregate([
    {
      $match: {
        offer_id: { $in: offerIds },
        project_id: projectObjectId,
        origin: 'addendum',
        price_list_item_id: { $in: [null, undefined] },
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
        offer_id: 1,
        origin: 1,
        source: 1,
        description: 1,
        code: 1,
        unit_measure: 1,
        quantity: 1,
        unit_price: 1,
        notes: 1,
        price_list_item_id: 1,
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
