import { defineEventHandler, getHeader } from 'h3';
import { UserContext } from '#models';

const resolveUserScope = (event: any) => {
  const userId = getHeader(event, 'x-user-id') || 'demo-user';
  const organizationId = getHeader(event, 'x-org-id') || null;
  return { userId, organizationId };
};

export default defineEventHandler(async (event) => {
  const { userId, organizationId } = resolveUserScope(event);

  const existing = await UserContext.findOne({
    user_id: userId,
    organization_id: organizationId,
  }).lean();

  return {
    currentProjectId: existing?.current_project_id ?? null,
    currentEstimateId: existing?.current_estimate_id ?? null,
  };
});
