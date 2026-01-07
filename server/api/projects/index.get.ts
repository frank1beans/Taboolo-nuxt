import { defineEventHandler, createError, getQuery } from 'h3';
import { Types } from 'mongoose';
import { listProjects } from '../../services/ProjectService';
import { serializeDocs } from '#utils/serialize';
import { Estimate, Offer } from '#models';
import type { Project } from '../../../types';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);

    const clampInt = (value: unknown, fallback: number, min: number, max: number) => {
      const parsed = Number.parseInt(String(value), 10);
      if (!Number.isFinite(parsed)) return fallback;
      return Math.min(Math.max(parsed, min), max);
    };

    // Extract params
    const page = clampInt(query.page, 1, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = clampInt(query.pageSize, 50, 1, 200);
    const sortField = (query.sort as string) || 'created_at';
    const sortOrder = (query.order === 'asc' ? 'asc' : 'desc');
    const search = query.search as string;

    let filters: Record<string, any> | undefined;
    if (query.filters) {
      filters = typeof query.filters === 'string' ? JSON.parse(query.filters) : query.filters;
    }

    // Call Service
    const { projects, total } = await listProjects({
      page,
      pageSize,
      sortField,
      sortOrder,
      search,
      filters,
    });

    const projectIds = projects
      .map((project) => project?.id)
      .filter((id): id is string => typeof id === 'string' && Types.ObjectId.isValid(id));

    const countsMap = new Map<string, { estimates_count: number; offers_count: number }>();
    if (projectIds.length) {
      const projectObjectIds = projectIds.map((id) => new Types.ObjectId(id));

      const estimateCounts = await Estimate.aggregate([
        { $match: { project_id: { $in: projectObjectIds }, type: 'project' } },
        {
          $group: {
            _id: '$project_id',
            count: { $sum: 1 },
          },
        },
      ]);

      const offerCounts = await Offer.aggregate([
        { $match: { project_id: { $in: projectObjectIds } } },
        {
          $group: {
            _id: '$project_id',
            count: { $sum: 1 },
          },
        },
      ]);

      estimateCounts.forEach((row) => {
        const id = row._id?.toString?.();
        if (!id) return;
        const existing = countsMap.get(id) ?? { estimates_count: 0, offers_count: 0 };
        countsMap.set(id, { ...existing, estimates_count: row.count ?? 0 });
      });

      offerCounts.forEach((row) => {
        const id = row._id?.toString?.();
        if (!id) return;
        const existing = countsMap.get(id) ?? { estimates_count: 0, offers_count: 0 };
        countsMap.set(id, { ...existing, offers_count: row.count ?? 0 });
      });
    }

    const data = serializeDocs<Project>(projects).map((project) => ({
      ...project,
      estimates_count: countsMap.get(project.id)?.estimates_count ?? 0,
      offers_count: countsMap.get(project.id)?.offers_count ?? 0,
    }));

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching projects',
      cause: error,
    });
  }
});
