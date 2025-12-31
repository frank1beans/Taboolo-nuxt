import { defineEventHandler, createError, readBody } from 'h3';
import { resolveAlert } from '#services/ConflictService';
import { serializeDoc } from '#utils/serialize';
import { requireObjectIdParam } from '#utils/validate';

type AlertUpdateBody = {
  status?: 'open' | 'resolved' | 'ignored';
  resolution_note?: string;
  resolved_by?: string;
  selected_price_list_item_id?: string;
  apply_approved_price?: boolean;
};

export default defineEventHandler(async (event) => {
  const projectId = requireObjectIdParam(event, 'id', 'Project ID');
  const alertId = requireObjectIdParam(event, 'alertId', 'Alert ID');

  const body = await readBody<AlertUpdateBody>(event);
  const status = body?.status;

  if (!status) {
    throw createError({ statusCode: 400, statusMessage: 'Status required' });
  }

  try {
    const alert = await resolveAlert(projectId, alertId, {
      status,
      resolution_note: body.resolution_note,
      resolved_by: body.resolved_by,
      selected_price_list_item_id: body.selected_price_list_item_id,
      apply_approved_price: body.apply_approved_price,
    });

    return { success: true, alert: serializeDoc(alert) };
  } catch (error: any) {
    if (error.message === 'Alert not found') {
      throw createError({ statusCode: 404, statusMessage: 'Alert not found' });
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Error resolving alert',
      cause: error
    });
  }
});
