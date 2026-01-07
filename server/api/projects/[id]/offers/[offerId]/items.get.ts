
import { defineEventHandler, createError, getRouterParam } from 'h3';
import mongoose from 'mongoose';
import type { PipelineStage } from 'mongoose';
import { PriceListItem, Offer } from '#models';
import { serializeDocs } from '#utils/serialize';

export default defineEventHandler(async (event) => {
    const projectId = getRouterParam(event, 'id');
    const offerId = getRouterParam(event, 'offerId');

    if (!projectId || !offerId) {
        throw createError({ statusCode: 400, statusMessage: 'Project ID and Offer ID required' });
    }

    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(offerId)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid project or offer id' });
    }

    try {
        const validProjectId = new mongoose.Types.ObjectId(projectId);
        const validOfferId = new mongoose.Types.ObjectId(offerId);

        // 1. Fetch Offer to get EstimateID and Company context
        const offer = await Offer.findOne({ _id: validOfferId, project_id: validProjectId }).lean();
        if (!offer) {
            throw createError({ statusCode: 404, statusMessage: 'Offer not found' });
        }

        // Ensure we have estimate_id
        if (!offer.estimate_id) {
            throw createError({ statusCode: 500, statusMessage: 'Offer has no associated estimate_id' });
        }

        const validEstimateId = new mongoose.Types.ObjectId(String(offer.estimate_id));

        // 2. Build Pipeline
        const query: Record<string, unknown> = {
            project_id: validProjectId,
            estimate_id: validEstimateId,
        };

        const aggregationPipeline: PipelineStage[] = [
            { $match: query },
            // Hybrid Lookup steps
            {
                $lookup: {
                    from: 'estimateitems',
                    let: { pli_id: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: [{ $convert: { input: '$price_list_item_id', to: 'objectId', onError: null, onNull: null } }, '$$pli_id'] },
                                project_id: validProjectId,
                                'project.estimate_id': validEstimateId
                            }
                        },
                        { $project: { _id: 1 } }
                    ],
                    as: 'linked_est_items'
                }
            },
            {
                $lookup: {
                    from: 'offeritems',
                    let: {
                        pli_id: '$_id',
                        est_item_ids: '$linked_est_items._id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$offer_id', validOfferId] },
                                        {
                                            $or: [
                                                { $eq: ['$price_list_item_id', '$$pli_id'] },
                                                { $in: ['$estimate_item_id', { $ifNull: ['$$est_item_ids', []] }] }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'related_items'
                }
            },
            {
                $addFields: {
                    total_quantity: { $sum: '$related_items.quantity' },
                    offer_unit_price: { $arrayElemAt: ['$related_items.unit_price', 0] },
                    total_amount: {
                        $sum: {
                            $map: {
                                input: '$related_items',
                                as: 'ri',
                                in: {
                                    $cond: {
                                        if: { $gt: ['$$ri.amount', 0] },
                                        then: '$$ri.amount',
                                        else: {
                                            $multiply: [
                                                { $ifNull: ['$$ri.quantity', 0] },
                                                { $ifNull: ['$$ri.unit_price', 0] }
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            // WBS Join
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
            { $project: { wbs_nodes: 0, wbs6_node: 0, wbs7_node: 0, related_items: 0, linked_est_items: 0 } },
            { $sort: { wbs6_code: 1, wbs7_code: 1, code: 1 } }
        ];

        const items = await PriceListItem.aggregate(aggregationPipeline);

        return { items: serializeDocs(items) };
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Error fetching offer items',
            cause: error,
        });
    }
});
