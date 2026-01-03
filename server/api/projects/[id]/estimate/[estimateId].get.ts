import { defineEventHandler, createError } from 'h3';
import { getEstimateById } from '#services/EstimateService';
import { serializeDoc } from '#utils/serialize';
import { requireObjectIdParam } from '#utils/validate';
import { AppError } from '#utils/AppError';

export default defineEventHandler(async (event) => {
  const projectId = requireObjectIdParam(event, 'id', 'Project ID');
  const estimateId = requireObjectIdParam(event, 'estimateId', 'Estimate ID');

  try {
    const estimate = await getEstimateById(estimateId);

    if (String(estimate.project_id) !== projectId) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Estimate not found for project',
      });
    }

    const serialized = serializeDoc(estimate);
    return {
      ...serialized,
      project_id: estimate.project_id?.toString?.() ?? serialized?.project_id,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error.toH3Error();
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching estimate',
      cause: error,
    });
  }
});




