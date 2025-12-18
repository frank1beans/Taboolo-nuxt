import { defineEventHandler, readBody, createError, getHeader } from 'h3';
import type { H3Event } from 'h3';
import { Estimate, Project, UserContext } from '#models';

const resolveUserScope = (event: H3Event) => {
  const userId = getHeader(event, 'x-user-id') || 'demo-user';
  const organizationId = getHeader(event, 'x-org-id') || null;
  return { userId, organizationId };
};

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody<{
    currentProjectId?: string | null;
    currentEstimateId?: string | null;
  }>(event);

  const currentProjectId = body?.currentProjectId ?? null;
  const currentEstimateId = body?.currentEstimateId ?? null;

  if (currentEstimateId && !currentProjectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'currentProjectId is required when setting currentEstimateId',
    });
  }

  const { userId, organizationId } = resolveUserScope(event);

  if (currentProjectId) {
    const exists = await Project.exists({ _id: currentProjectId });
    if (!exists) {
      throw createError({ statusCode: 404, statusMessage: 'Project not found' });
    }
  }

  if (currentEstimateId) {
    const estimate = await Estimate.findOne({
      _id: currentEstimateId,
      project_id: currentProjectId,
    });

    if (!estimate) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Estimate not found for the provided project',
      });
    }
  }

  const saved = await UserContext.findOneAndUpdate(
    { user_id: userId, organization_id: organizationId },
    {
      user_id: userId,
      organization_id: organizationId,
      current_project_id: currentProjectId,
      current_estimate_id: currentEstimateId,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return {
    currentProjectId: saved.current_project_id ?? null,
    currentEstimateId: saved.current_estimate_id ?? null,
  };
});
