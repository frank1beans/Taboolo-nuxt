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
    const filter: any = {};

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
        const filters = typeof query.filters === 'string'
          ? JSON.parse(query.filters)
          : query.filters;

        for (const [field, filterConfig] of Object.entries(filters as Record<string, any>)) {
          if (filterConfig.filter !== undefined) {
            if (filterConfig.type === 'equals') {
              filter[field] = filterConfig.filter;
            } else if (filterConfig.type === 'contains') {
              filter[field] = new RegExp(filterConfig.filter, 'i');
            } else if (filterConfig.type === 'notBlank') {
              filter[field] = { $nin: [null, ''] };
            }
          }
        }
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
