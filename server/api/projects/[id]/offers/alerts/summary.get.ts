import { defineEventHandler, createError, getQuery } from 'h3';
import { getAlertsSummary } from '#services/ConflictService';
import { requireObjectIdParam } from '#utils/validate';

export default defineEventHandler(async (event) => {
  const projectId = requireObjectIdParam(event, 'id', 'Project ID');

  const query = getQuery(event);
  const groupBy = (query.group_by as string | undefined) || 'offer';
  const offerId = query.offer_id as string | undefined;
  const estimateId = query.estimate_id as string | undefined;
  const status = query.status as string | undefined;
  const type = query.type as string | undefined;

  try {
    return await getAlertsSummary(projectId, {
      groupBy,
      offerId,
      estimateId,
      type: type ? type.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      status: status ? status.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    });
  } catch (error: any) {
    if (error.message === 'Invalid group_by') {
      throw createError({ statusCode: 400, statusMessage: 'Invalid group_by' });
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching summary',
      cause: error
    });
  }
});
