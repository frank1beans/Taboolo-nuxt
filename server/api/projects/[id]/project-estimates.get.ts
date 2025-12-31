import { defineEventHandler, createError } from 'h3';
import { listEstimates } from '#services/EstimateService';
import { serializeDocs } from '#utils/serialize';
import { requireObjectIdParam } from '#utils/validate';

export default defineEventHandler(async (event) => {
  const projectObjectId = requireObjectIdParam(event, 'id', 'Project ID');

  try {
    const estimates = await listEstimates(projectObjectId);
    return serializeDocs(estimates);
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching estimates',
      cause: error,
    });
  }
});
