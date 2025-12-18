import { defineEventHandler, createError, getQuery } from 'h3';
import { Project } from '#models';
import { serializeDocs } from '#utils/serialize';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);

    // Pagination params
    const page = parseInt(query.page as string) || 1;
    const pageSize = parseInt(query.pageSize as string) || 50;
    const skip = (page - 1) * pageSize;

    // Sort params
    const sortField = (query.sort as string) || 'created_at';
    const sortOrder = query.order === 'asc' ? 1 : -1;

    // Build filter query
    const filter: Record<string, unknown> = {};

    // Quick search (searches across multiple fields)
    if (query.search) {
      const searchRegex = new RegExp(query.search as string, 'i');
      filter.$or = [
        { code: searchRegex },
        { name: searchRegex },
        { description: searchRegex },
        { business_unit: searchRegex },
      ];
    }

    // Column filters (from DataGrid filterModel)
    if (query.filters) {
      try {
        const parsedFilters = typeof query.filters === 'string'
          ? JSON.parse(query.filters)
          : query.filters;

        Object.entries(parsedFilters as Record<string, unknown>).forEach(([field, rawConfig]) => {
          if (!rawConfig || typeof rawConfig !== 'object') return;
          const config = rawConfig as { filter?: unknown; type?: string };
          if (config.filter !== undefined) {
            if (config.type === 'equals') {
              filter[field] = config.filter;
            } else if (config.type === 'contains') {
              filter[field] = new RegExp(String(config.filter), 'i');
            } else if (config.type === 'notBlank') {
              filter[field] = { $nin: [null, ''] };
            }
          }
        });
      } catch (err) {
        console.error('Error parsing filters:', err);
      }
    }

    // Execute queries in parallel
    const [projects, total] = await Promise.all([
      Project.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Project.countDocuments(filter),
    ]);

    return {
      data: serializeDocs(projects),
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
