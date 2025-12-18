import { defineEventHandler, createError, getRouterParam, readBody } from 'h3';
import { Types } from 'mongoose';
import { OfferItem } from '#models';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  const itemId = getRouterParam(event, 'itemId');

  if (!projectId || !itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID and item ID required' });
  }

  const body = await readBody<{ price_list_item_id?: string }>(event);
  const pliId = body?.price_list_item_id;

  if (!pliId || !Types.ObjectId.isValid(pliId)) {
    throw createError({ statusCode: 400, statusMessage: 'Valid price_list_item_id required' });
  }

  const projectObjectId = new Types.ObjectId(projectId);
  const itemObjectId = new Types.ObjectId(itemId);
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

  return { success: true };
});
