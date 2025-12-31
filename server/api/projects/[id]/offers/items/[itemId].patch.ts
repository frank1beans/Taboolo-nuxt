import { defineEventHandler, createError, readBody } from 'h3';
import { Types } from 'mongoose';
import { OfferAlert, OfferItem } from '#models';
import { requireObjectIdParam, toObjectId } from '#utils/validate';

export default defineEventHandler(async (event) => {
  const projectId = requireObjectIdParam(event, 'id', 'Project ID');
  const itemId = requireObjectIdParam(event, 'itemId', 'Item ID');

  const body = await readBody<{ price_list_item_id?: string }>(event);
  const pliId = body?.price_list_item_id;

  if (!pliId || !Types.ObjectId.isValid(pliId)) {
    throw createError({ statusCode: 400, statusMessage: 'Valid price_list_item_id required' });
  }

  const projectObjectId = toObjectId(projectId);
  const itemObjectId = toObjectId(itemId);
  const pliObjectId = new Types.ObjectId(pliId);

  const item = await OfferItem.findOne({ _id: itemObjectId, project_id: projectObjectId });
  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'Offer item not found' });
  }

  item.price_list_item_id = pliObjectId;
  item.candidate_price_list_item_ids = [];
  item.resolution_status = 'resolved';
  item.origin = 'baseline';

  await item.save();

  await OfferAlert.updateMany(
    {
      project_id: projectObjectId,
      offer_item_id: itemObjectId,
      status: { $in: ['open', null] },
    },
    {
      $set: {
        status: 'resolved',
        resolved_at: new Date(),
        resolution_note: 'Mapped to price list item',
      },
    },
  );

  return { success: true };
});
