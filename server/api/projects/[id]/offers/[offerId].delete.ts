import { defineEventHandler, createError, getRouterParam } from 'h3';
import { Types } from 'mongoose';
import { deleteOfferCascade } from '#services/OfferService';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  const offerId = getRouterParam(event, 'offerId');

  if (!projectId || !offerId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID and Offer ID are required' });
  }

  if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(offerId)) {
    throw createError({ statusCode: 400, statusMessage: 'Identificativi non validi' });
  }

  try {
    const result = await deleteOfferCascade(projectId, offerId);

    if (!result.deletedOffer) {
      throw createError({ statusCode: 404, statusMessage: 'Offerta non trovata' });
    }

    return {
      success: true,
      ...result,
      message: 'Offerta eliminata',
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Errore durante l'eliminazione dell'offerta",
      data: { message: error instanceof Error ? error.message : undefined },
    });
  }
});
