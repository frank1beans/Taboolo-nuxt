import { defineEventHandler, getQuery, createError } from 'h3';
import mongoose, { type PipelineStage } from 'mongoose';
import { PriceListItem } from '#models';
import { serializeDocs } from '#utils/serialize';

type VectorSearchResult = {
  id: string;
  score: number;
};

const clampInt = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.floor(parsed);
  return Math.min(Math.max(rounded, min), max);
};

const parseScore = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default defineEventHandler(async (event) => {
  const queryParams = getQuery(event);
  const query = String(queryParams.query ?? '').trim();
  if (!query) return [];

  const topK = clampInt(queryParams.top_k, 50, 1, 100);
  const minScore = parseScore(queryParams.min_score);
  const projectId = queryParams.project_id ? String(queryParams.project_id) : undefined;

  const config = useRuntimeConfig();
  const pythonUrl = config.pythonApiBaseUrl || 'http://localhost:8000/api/v1';

  let searchResults: VectorSearchResult[] = [];
  try {
    searchResults = await $fetch<VectorSearchResult[]>(`${pythonUrl}/analytics/search`, {
      method: 'POST',
      body: {
        query,
        projectId,
        limit: topK,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Vector search failed';
    throw createError({ statusCode: 500, message });
  }

  if (!Array.isArray(searchResults) || searchResults.length === 0) return [];

  if (minScore !== null) {
    searchResults = searchResults.filter((result) => result.score >= minScore);
  }

  if (searchResults.length === 0) return [];

  const ids = searchResults.map((result) => result.id).filter(Boolean);
  const objectIds = ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (objectIds.length === 0) return [];

  const pipeline: PipelineStage[] = [
    { $match: { _id: { $in: objectIds } } },
  ];

  if (projectId) {
    if (mongoose.Types.ObjectId.isValid(projectId)) {
      const pid = new mongoose.Types.ObjectId(projectId);
      pipeline.push({
        $match: { $or: [{ project_id: projectId }, { project_id: pid }] },
      });
    } else {
      pipeline.push({ $match: { project_id: projectId } });
    }
  }

  pipeline.push(
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

  const items = await PriceListItem.aggregate(pipeline, { allowDiskUse: true });
  const serialized = serializeDocs(items);

  const scoreById = new Map(searchResults.map((result) => [result.id, result.score]));
  const orderById = new Map(searchResults.map((result, idx) => [result.id, idx]));

  const enriched = serialized.map((item) => {
    const id = String(item.id ?? '');
    return {
      ...item,
      score: scoreById.get(id) ?? 0,
    };
  });

  enriched.sort((a, b) => {
    const aIndex = orderById.get(String(a.id)) ?? 0;
    const bIndex = orderById.get(String(b.id)) ?? 0;
    return aIndex - bIndex;
  });

  return enriched;
});
