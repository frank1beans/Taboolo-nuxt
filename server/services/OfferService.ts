/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import { Offer, OfferItem } from '#models';
import { serializeDoc } from '#utils/serialize';

type OfferUpdateInput = {
  name?: string;
  company_name?: string;
  round_number?: number;
  status?: 'draft' | 'submitted' | 'accepted' | 'rejected';
  mode?: 'detailed' | 'aggregated';
  total_amount?: number | null;
  description?: string | null;
  date?: string | Date | null;
};

const allowedStatuses = new Set(['draft', 'submitted', 'accepted', 'rejected']);
const allowedModes = new Set(['detailed', 'aggregated']);

export async function deleteOfferCascade(projectId: string, offerId: string, session?: any) {
  const projectObjectId = new Types.ObjectId(projectId);
  const offerObjectId = new Types.ObjectId(offerId);
  const opts = session ? { session } : undefined;

  const offer = await Offer.findOne({ _id: offerObjectId, project_id: projectObjectId }).lean();
  if (!offer) {
    return { deletedOffer: 0, deletedItems: 0 };
  }

  const itemsResult = await OfferItem.deleteMany({ offer_id: offerObjectId, project_id: projectObjectId }, opts);
  const offerResult = await Offer.deleteOne({ _id: offerObjectId, project_id: projectObjectId }, opts);

  return {
    deletedOffer: offerResult.deletedCount || 0,
    deletedItems: itemsResult.deletedCount || 0,
  };
}

export async function updateOffer(projectId: string, offerId: string, input: OfferUpdateInput) {
  const projectObjectId = new Types.ObjectId(projectId);
  const offerObjectId = new Types.ObjectId(offerId);

  const update: Record<string, any> = {};

  if (typeof input.name === 'string') update.name = input.name.trim();
  if (typeof input.company_name === 'string') update.company_name = input.company_name.trim();

  if (input.round_number !== undefined && input.round_number !== null) {
    const round = Number(input.round_number);
    if (Number.isNaN(round)) {
      throw new Error('round_number must be a number');
    }
    update.round_number = round;
  }

  if (input.status && allowedStatuses.has(input.status)) {
    update.status = input.status;
  }

  if (input.mode && allowedModes.has(input.mode)) {
    update.mode = input.mode;
  }

  if (input.total_amount !== undefined) {
    if (input.total_amount === null) {
      update.total_amount = null;
    } else {
      const amount = Number(input.total_amount);
      if (Number.isNaN(amount)) {
        throw new Error('total_amount must be numeric');
      }
      update.total_amount = amount;
    }
  }

  if (input.description !== undefined) {
    update.description = input.description;
  }

  if (input.date !== undefined) {
    update.date = input.date ? new Date(input.date) : null;
  }

  if (!Object.keys(update).length) {
    throw new Error('No valid fields to update');
  }

  const offer = await Offer.findOneAndUpdate(
    { _id: offerObjectId, project_id: projectObjectId },
    { $set: update },
    { new: true },
  );

  return offer ? serializeDoc(offer.toObject()) : null;
}
