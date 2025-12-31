import { defineEventHandler, getQuery } from 'h3';
import { listAlerts } from '#services/ConflictService';
import { serializeDocs } from '#utils/serialize';
import { requireObjectIdParam } from '#utils/validate';

export default defineEventHandler(async (event) => {
  const projectId = requireObjectIdParam(event, 'id', 'Project ID');

  const query = getQuery(event);
  const offerId = query.offer_id as string | undefined;
  const estimateId = query.estimate_id as string | undefined;
  const type = query.type as string | undefined;
  const severity = query.severity as string | undefined;
  const status = query.status as string | undefined;

  const alerts = await listAlerts({
    projectId,
    offerId,
    estimateId,
    type: type ? type.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    severity: severity ? severity.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    status: status ? status.split(',').map(s => s.trim()).filter(Boolean) : undefined,
  });

  return { alerts: serializeDocs(alerts) };
});
