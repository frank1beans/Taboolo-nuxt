import { defineEventHandler, createError, readBody } from 'h3';
import { mergeEstimates } from '#services/EstimateMergeService';
import { requireObjectId, requireObjectIdParam } from '#utils/validate';

type MergeRequestBody = {
  estimate_ids?: string[];
  estimateIds?: string[];
  name?: string;
  price_list_name?: string;
  priceListName?: string;
  set_as_baseline?: boolean;
  setAsBaseline?: boolean;
};

export default defineEventHandler(async (event) => {
  const projectId = requireObjectIdParam(event, 'id', 'Project ID');

  const body = await readBody<MergeRequestBody>(event);
  const estimateIds = body?.estimate_ids || body?.estimateIds || [];

  if (!Array.isArray(estimateIds) || estimateIds.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'At least two estimate IDs are required' });
  }

  const normalizedEstimateIds = estimateIds.map((id) => requireObjectId(id, 'Estimate ID'));

  try {
    return await mergeEstimates(projectId, {
      estimate_ids: normalizedEstimateIds,
      name: body?.name,
      price_list_name: body?.price_list_name || body?.priceListName,
      set_as_baseline: body?.set_as_baseline ?? body?.setAsBaseline,
    });
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error merging estimates',
      cause: error,
    });
  }
});
