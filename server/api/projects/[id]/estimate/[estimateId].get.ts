import { defineEventHandler, createError } from 'h3';
import { getEstimateById } from '#services/EstimateService';
import { serializeDoc } from '#utils/serialize';
import { requireObjectIdParam } from '#utils/validate';

export default defineEventHandler(async (event) => {
  const projectId = requireObjectIdParam(event, 'id', 'Project ID');
  const estimateId = requireObjectIdParam(event, 'estimateId', 'Estimate ID');

  try {
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching estimate',
      cause: error,
    });
  }
});




