import { defineEventHandler, createError, getRouterParam, readBody } from 'h3';
import { Types } from 'mongoose';
import { updateOffer } from '#services/OfferService';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  const offerId = getRouterParam(event, 'offerId');

  if (!projectId || !offerId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID and Offer ID are required' });
  }

  if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(offerId)) {
    throw createError({ statusCode: 400, statusMessage: 'Identificativi non validi' });
  }

  const body = await readBody(event).catch(() => ({}));

  try {
    const offer = await updateOffer(projectId, offerId, body || {});

    if (!offer) {
      throw createError({ statusCode: 404, statusMessage: 'Offerta non trovata' });
    }

    return { success: true, offer };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Errore durante l'aggiornamento dell'offerta";
    throw createError({
      statusCode: 400,
      statusMessage: message,
      data: { message },
    });
  }
});
