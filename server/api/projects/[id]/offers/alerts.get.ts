import { defineEventHandler, createError, getRouterParam, getQuery } from 'h3';
import { Types } from 'mongoose';
import { OfferAlert } from '#models';
import { serializeDocs } from '#utils/serialize';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  const query = getQuery(event);
  const offerId = query.offer_id as string | undefined;
  const type = query.type as string | undefined;
  const severity = query.severity as string | undefined;

  const filter: Record<string, unknown> = { project_id: new Types.ObjectId(projectId) };

  if (offerId && Types.ObjectId.isValid(offerId)) {
    filter.offer_id = new Types.ObjectId(offerId);
  }

  if (type) {
    const types = type.split(',').map((t) => t.trim()).filter(Boolean);
    if (types.length) {
      filter.type = { $in: types };
    }
  }

  if (severity) {
    const severities = severity.split(',').map((s) => s.trim()).filter(Boolean);
    if (severities.length) {
      filter.severity = { $in: severities };
    }
  }

  const alerts = await OfferAlert.find(filter).sort({ created_at: -1 }).lean();

  return { alerts: serializeDocs(alerts) };
});
