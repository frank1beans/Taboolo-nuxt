
import { OfferRepository } from '#repositories/OfferRepository';
import { EstimateRepository } from '#repositories/EstimateRepository';
import { AppError } from '#utils/AppError';
import { CreateOfferSchema, UpdateOfferSchema } from '../validation/offer.schema';
import { objectIdSchema } from '../validation';
import type { Offer } from '../../types';
import { Types } from 'mongoose';

/**
 * Service for managing Offers.
 */

// --- Queries ---

export async function listOffers(projectId: string) {
  const validId = objectIdSchema.parse(projectId);
  return OfferRepository.find({ project_id: validId });
}

export async function getOfferById(id: string) {
  const validId = objectIdSchema.parse(id);
  const offer = await OfferRepository.findById(validId);
  if (!offer) {
    throw AppError.notFound(`Offer with id ${id} not found`);
  }
  return offer;
}

// --- Mutations ---

export async function createOffer(data: unknown) {
  const validData = CreateOfferSchema.parse(data);

  // Map to Mongoose/Repository Type manually until we have better DTO mapping
  const payload: any = {
    ...validData,
    project_id: new Types.ObjectId(validData.project_id),
  };
  if (validData.price_list_id) payload.price_list_id = new Types.ObjectId(validData.price_list_id);
  if (validData.source_preventivo_id) payload.source_preventivo_id = new Types.ObjectId(validData.source_preventivo_id);

  return OfferRepository.create(payload);
}

export async function updateOffer(id: string, data: unknown) {
  const validId = objectIdSchema.parse(id);
  const validData = UpdateOfferSchema.parse(data);

  // Map partial update payload
  const payload: any = { ...validData };
  if (validData.project_id) payload.project_id = new Types.ObjectId(validData.project_id);
  if (validData.price_list_id) payload.price_list_id = new Types.ObjectId(validData.price_list_id);
  if (validData.source_preventivo_id) payload.source_preventivo_id = new Types.ObjectId(validData.source_preventivo_id);

  // Check existence? Repository.update usually returns null if not found
  const updated = await OfferRepository.update(validId, payload);
  if (!updated) {
    throw AppError.notFound(`Offer with id ${id} not found`);
  }
  return updated;
}

export async function deleteOffer(id: string) {
  const validId = objectIdSchema.parse(id);
  const result = await OfferRepository.delete(validId);
  if (!result) {
    throw AppError.notFound(`Offer with id ${id} not found`);
  }
  return result;
}

/**
 * Delete an offer and its related items/alerts cascade.
 */
export async function deleteOfferCascade(projectId: string, offerId: string) {
  const validProjectId = objectIdSchema.parse(projectId);
  const validOfferId = objectIdSchema.parse(offerId);

  // 1. Delete associated Offer Items
  const itemsResult = await OfferRepository.deleteItemsByOfferIds([validOfferId]);

  // 2. Delete the Offer itself
  const offerResult = await OfferRepository.delete(validOfferId);

  if (!offerResult) {
    return { deletedOffer: false };
  }

  return {
    deletedOffer: true,
    deletedItems: itemsResult.deletedCount ?? 0
  };
}
