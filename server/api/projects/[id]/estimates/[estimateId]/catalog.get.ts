
import { defineEventHandler, createError, getRouterParam } from 'h3';
import mongoose from 'mongoose';
import type { PipelineStage } from 'mongoose';
import { PriceListItem } from '#models';
import { serializeDocs } from '#utils/serialize';

export default defineEventHandler(async (event) => {
    const projectId = getRouterParam(event, 'id');
    const estimateId = getRouterParam(event, 'estimateId');

    if (!projectId || !estimateId) {
        throw createError({ statusCode: 400, statusMessage: 'Project ID and Estimate ID required' });
    }

    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(estimateId)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid project or estimate id' });
    }

    try {
        const validProjectId = new mongoose.Types.ObjectId(projectId);
        const validEstimateId = new mongoose.Types.ObjectId(estimateId);

        const query: Record<string, unknown> = {
            project_id: validProjectId,
            estimate_id: validEstimateId,
        };

        const aggregationPipeline: PipelineStage[] = [
            { $match: query },
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
            { $project: { wbs_nodes: 0, wbs6_node: 0, wbs7_node: 0 } },
            { $sort: { wbs6_code: 1, wbs7_code: 1, code: 1 } }
        ];

        const items = await PriceListItem.aggregate(aggregationPipeline);

        return { items: serializeDocs(items) };
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Error fetching price list catalog',
            cause: error,
        });
    }
});
