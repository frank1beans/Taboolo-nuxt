import { defineEventHandler, createError, getRouterParam } from 'h3';
import { Types } from 'mongoose';
import { EstimateItem } from '#models'; // Updated
import { serializeDocs } from '#utils/serialize';

export default defineEventHandler(async (event) => {
    const projectId = getRouterParam(event, 'id');
    const estimateId = getRouterParam(event, 'estimateId');

    if (!projectId || !estimateId) {
        throw createError({ statusCode: 400, statusMessage: 'Project ID and Estimate ID required' });
    }

    try {
        // Fetch items that belong to this project and have the specific estimate_id in their project data
        const validProjectId = new Types.ObjectId(projectId);
        const validEstimateId = new Types.ObjectId(estimateId);

        const items = await EstimateItem.aggregate([
            {
                $match: {
                    project_id: validProjectId,
                    'project.estimate_id': validEstimateId
                }
            },
            { $sort: { order: 1 } },
            {
                $addFields: {
                    // Convert stored string ID to ObjectId for lookup
                    pli_oid: { $toObjectId: "$price_list_item_id" }
                }
            },
            {
                $lookup: {
                    from: 'pricelistitems',
                    localField: 'pli_oid',
                    foreignField: '_id',
                    as: 'price_item'
                }
            },
            { $unwind: { path: '$price_item', preserveNullAndEmptyArrays: true } },
            // Lookup WBS nodes for estimate item (wbs01-wbs05)
            {
                $lookup: {
                    from: 'wbsnodes',
                    localField: 'wbs_ids',
                    foreignField: '_id',
                    as: 'item_wbs_nodes'
                }
            },
            // Lookup WBS nodes for price list item (wbs06-wbs07)
            {
                $lookup: {
                    from: 'wbsnodes',
                    let: { pli_group_ids: '$price_item.wbs_ids' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: ['$_id', { $ifNull: ['$$pli_group_ids', []] }] },
                                        { $in: ['$level', [6, 7]] } // Filter by level 6/7
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'pli_wbs_nodes'
                }
            },
            {
                $addFields: {
                    code: { $ifNull: ['$code', '$price_item.code'] },
                    description: { $ifNull: ['$description', '$price_item.description'] },
                    unit_measure: { $ifNull: ['$unit_measure', '$price_item.unit'] },
                    // Map wbs_ids to group_ids for frontend
                    group_ids: '$wbs_ids',
                    // Combine all WBS nodes
                    all_wbs_nodes: { $concatArrays: ['$item_wbs_nodes', '$pli_wbs_nodes'] },
                }
            },
            {
                $addFields: {
                    // Create object with wbs01-wbs07 keys based on LEVEL
                    wbs_hierarchy: {
                        $arrayToObject: {
                            $map: {
                                input: '$all_wbs_nodes',
                                as: 'node',
                                in: {
                                    // Construct key "wbs0X" from level
                                    // if level exists, use it. Format 0-pad?
                                    // simple cases: 1->wbs01, 2->wbs02...
                                    k: { $concat: ['wbs0', { $toString: '$$node.level' }] },
                                    v: '$$node.description'
                                }
                            }
                        }
                    },
                    project: {
                        $mergeObjects: [
                            '$project',
                            {
                                unit_price: { $ifNull: ['$project.unit_price', '$price_item.price'] },
                                amount: {
                                    $cond: {
                                        if: { $gt: ['$project.amount', null] }, // Check if > null (exists and not null) or use type check? $ifNull is easier if we accept stored 0.
                                        // If project.amount exists, use it.
                                        then: '$project.amount',
                                        else: { $multiply: ['$project.quantity', { $ifNull: ['$price_item.price', 0] }] }
                                    }
                                }
                            }
                        ]
                    }
                }
            },
            // Project only necessary fields (optional, but good for leaner payloads)
            // Keep progressive and group_ids for frontend display
            {
                $project: {
                    pli_oid: 0,
                    price_item: 0
                }
            }
        ]);

        return serializeDocs(items);
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Error fetching estimate items',
            cause: error,
        });
    }
});
