import { defineEventHandler, getQuery } from 'h3';
import mongoose, { type PipelineStage } from 'mongoose';
import { PriceListItem, Project, WbsNode } from '#models';
import { serializeDocs } from '#utils/serialize';

const SET_FILTER_PREFIX = '__set__:';

const decodeSetFilter = (raw: unknown): string[] | null => {
  if (typeof raw !== 'string' || !raw.startsWith(SET_FILTER_PREFIX)) return null;
  try {
    const parsed = JSON.parse(raw.slice(SET_FILTER_PREFIX.length));
    if (!Array.isArray(parsed)) return null;
    return parsed.map((val) => String(val));
  } catch {
    return null;
  }
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildTextCondition = (type: string | undefined, rawValue: unknown) => {
  const value = String(rawValue ?? '').trim();
  if (!value) return null;

  switch (type) {
    case 'equals':
      return value;
    case 'startsWith':
      return new RegExp(`^${escapeRegex(value)}`, 'i');
    case 'notEqual':
      return { $ne: value };
    case 'notContains':
      return { $not: new RegExp(escapeRegex(value), 'i') };
    case 'blank':
      return { $in: [null, ''] };
    case 'notBlank':
      return { $nin: [null, ''] };
    case 'contains':
    default:
      return new RegExp(escapeRegex(value), 'i');
  }
};

const buildNumberCondition = (type: string | undefined, rawValue: unknown) => {
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) return null;

  switch (type) {
    case 'greaterThan':
      return { $gt: numeric };
    case 'greaterThanOrEqual':
      return { $gte: numeric };
    case 'lessThan':
      return { $lt: numeric };
    case 'lessThanOrEqual':
      return { $lte: numeric };
    case 'notEqual':
      return { $ne: numeric };
    case 'equals':
    default:
      return numeric;
  }
};

type WbsFilter = { level: 6 | 7; field: 'code' | 'description'; values: string[] };

export default defineEventHandler(async (event) => {
  const queryParams = getQuery(event);
  const rawPage = queryParams.page ? Number(queryParams.page) : null;
  const rawPageSize = queryParams.pageSize ? Number(queryParams.pageSize) : null;
  const isPaged = Number.isFinite(rawPage) && Number.isFinite(rawPageSize);
  const page = isPaged ? Math.max(1, Number(rawPage)) : 1;
  const pageSize = isPaged ? Math.max(1, Number(rawPageSize)) : 0;
  const skip = isPaged ? (page - 1) * pageSize : 0;

  const match: Record<string, unknown> = {};
  const wbsFilters: WbsFilter[] = [];
  const projectFilters: Record<string, unknown> = {};

  if (queryParams.search) {
    const regex = new RegExp(escapeRegex(String(queryParams.search)), 'i');
    match.$or = [
      { code: regex },
      { description: regex },
      { long_description: regex },
      { extended_description: regex },
    ];
  }

  const rawFilters = queryParams.filters;
  if (rawFilters) {
    try {
      const parsedFilters = typeof rawFilters === 'string' ? JSON.parse(rawFilters) : rawFilters;
      const filterModel = parsedFilters as Record<string, { filter?: unknown; filterType?: string; type?: string }>;

      for (const [field, config] of Object.entries(filterModel)) {
        if (!config || typeof config !== 'object') continue;
        const setValues = decodeSetFilter(config.filter);

        if (field === 'project_name' || field === 'project_code') {
          const condition = buildTextCondition(config.type, config.filter);
          if (condition) {
            const key = field === 'project_name' ? 'name' : 'code';
            projectFilters[key] = condition;
          }
          continue;
        }

        if (field === 'wbs6_code' || field === 'wbs6_description' || field === 'wbs7_code' || field === 'wbs7_description') {
          const values = setValues ?? (config.filter ? [String(config.filter)] : []);
          if (values.length) {
            wbsFilters.push({
              level: field.startsWith('wbs6') ? 6 : 7,
              field: field.endsWith('code') ? 'code' : 'description',
              values,
            });
          }
          continue;
        }

        if (setValues && setValues.length) {
          match[field] = { $in: setValues };
          continue;
        }

        if (config.filterType === 'number') {
          const condition = buildNumberCondition(config.type, config.filter);
          if (condition !== null) match[field] = condition;
          continue;
        }

        const condition = buildTextCondition(config.type, config.filter);
        if (condition !== null) match[field] = condition;
      }
    } catch (error) {
      console.error('Catalog filter parse error:', error);
    }
  }

  if (queryParams.project_id) {
    const projectId = String(queryParams.project_id);
    if (mongoose.Types.ObjectId.isValid(projectId)) {
      match.project_id = new mongoose.Types.ObjectId(projectId);
    } else {
      match.project_id = projectId;
    }
  }

  if (queryParams.business_unit) {
    projectFilters.business_unit = String(queryParams.business_unit);
  }

  if (Object.keys(projectFilters).length) {
    const projects = await Project.find(projectFilters).select('_id').lean();
    if (!projects.length) {
      return isPaged
        ? { data: [], total: 0, page, pageSize, totalPages: 0 }
        : [];
    }
    const projectIds = projects.map((p) => p._id);
    if (match.project_id) {
      const rawId = match.project_id instanceof mongoose.Types.ObjectId ? match.project_id.toString() : String(match.project_id);
      const allowed = projectIds.some((id) => id.toString() === rawId);
      if (!allowed) {
        return isPaged
          ? { data: [], total: 0, page, pageSize, totalPages: 0 }
          : [];
      }
      match.project_id = match.project_id;
    } else {
      match.project_id = { $in: projectIds };
    }
  }

  if (wbsFilters.length) {
    const wbsConditions: Record<string, unknown>[] = [];
    for (const filter of wbsFilters) {
      const nodes = await WbsNode.find({
        level: filter.level,
        [filter.field]: { $in: filter.values },
      }).select('_id').lean();
      const ids = nodes.map((n) => n._id);
      if (!ids.length) {
        return isPaged
          ? { data: [], total: 0, page, pageSize, totalPages: 0 }
          : [];
      }
      wbsConditions.push({ wbs_ids: { $in: ids } });
    }
    if (wbsConditions.length === 1) {
      Object.assign(match, wbsConditions[0]);
    } else {
      match.$and = [...(match.$and as Record<string, unknown>[] | undefined ?? []), ...wbsConditions];
    }
  }

  const pipeline: PipelineStage[] = [];
  if (Object.keys(match).length) {
    pipeline.push({ $match: match });
  }

  const allowedSort = new Set(['code', 'description', 'long_description', 'extended_description', 'unit', 'price', 'created_at', 'updated_at']);
  const rawSort = queryParams.sort ? String(queryParams.sort) : 'created_at';
  const sortField = allowedSort.has(rawSort) ? rawSort : 'created_at';
  const sortOrder = queryParams.order === 'asc' ? 1 : -1;

  const dataPipeline: PipelineStage[] = [
    { $sort: { [sortField]: sortOrder } },
  ];

  if (isPaged) {
    dataPipeline.push({ $skip: skip }, { $limit: pageSize });
  }

  dataPipeline.push(
    {
      $lookup: {
        from: 'projects',
        localField: 'project_id',
        foreignField: '_id',
        as: 'project_doc',
      },
    },
    {
      $addFields: {
        project_doc: { $arrayElemAt: ['$project_doc', 0] },
        project_id: {
          $convert: {
            input: '$project_id',
            to: 'string',
            onError: null,
            onNull: null,
          },
        },
      },
    },
    {
      $addFields: {
        project_name: '$project_doc.name',
        project_code: '$project_doc.code',
        business_unit: '$project_doc.business_unit',
      },
    },
    {
      $lookup: {
        from: 'wbsnodes',
        localField: 'wbs_ids',
        foreignField: '_id',
        as: 'wbs_nodes',
      },
    },
    {
      $addFields: {
        wbs6_node: {
          $arrayElemAt: [
            {
              $filter: {
                input: '$wbs_nodes',
                as: 'node',
                cond: { $eq: ['$$node.level', 6] },
              },
            },
            0,
          ],
        },
        wbs7_node: {
          $arrayElemAt: [
            {
              $filter: {
                input: '$wbs_nodes',
                as: 'node',
                cond: { $eq: ['$$node.level', 7] },
              },
            },
            0,
          ],
        },
      },
    },
    {
      $addFields: {
        wbs6_code: '$wbs6_node.code',
        wbs6_description: '$wbs6_node.description',
        wbs7_code: '$wbs7_node.code',
        wbs7_description: '$wbs7_node.description',
      },
    },
    {
      $project: {
        wbs_nodes: 0,
        wbs6_node: 0,
        wbs7_node: 0,
        project_doc: 0,
      },
    },
  );

  if (isPaged) {
    pipeline.push({
      $facet: {
        data: dataPipeline,
        total: [{ $count: 'value' }],
      },
    });

    const [result] = await PriceListItem.aggregate(pipeline, { allowDiskUse: true });
    const data = serializeDocs(result?.data ?? []);
    const total = result?.total?.[0]?.value ?? 0;
    const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
    return { data, total, page, pageSize, totalPages };
  }

  pipeline.push(...dataPipeline);
  const items = await PriceListItem.aggregate(pipeline, { allowDiskUse: true });
  return serializeDocs(items);
});
