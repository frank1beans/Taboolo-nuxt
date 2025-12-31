import { defineEventHandler, createError, getQuery } from 'h3';
import { listProjects } from '../../services/ProjectService';
import { serializeDocs } from '#utils/serialize';
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

    return {
      data: serializeDocs<Project>(projects),
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
