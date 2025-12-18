import { defineEventHandler, createError, getRouterParam, getQuery } from 'h3';
import { Types } from 'mongoose';
import { EstimateItem, Offer, OfferItem } from '#models';
import { serializeDocs } from '#utils/serialize';

export default defineEventHandler(async (event) => {
    const projectId = getRouterParam(event, 'id');
    const estimateId = getRouterParam(event, 'estimateId');

    if (!projectId || !estimateId) {
        throw createError({ statusCode: 400, statusMessage: 'Project ID and Estimate ID required' });
    }

    try {
        const validProjectId = new Types.ObjectId(projectId);
        const validEstimateId = new Types.ObjectId(estimateId);

        // Check for filters
        const query = getQuery(event);
        const round = query.round ? Number(query.round) : undefined;
        const company = query.company as string | undefined;

        if (round !== undefined || company) {
            // ---------------------------------------------------------
            // 1. OFFER MODE
            // ---------------------------------------------------------

            // A. Find matching Offers
            const offerMatch: any = {
                project_id: validProjectId,
                estimate_id: validEstimateId
            };
            if (round !== undefined) offerMatch.round_number = round;
            if (company) offerMatch.company_name = company;

            const offers = await Offer.find(offerMatch).select('_id').lean();
            const offerIds = offers.map(o => o._id);

            if (offerIds.length === 0) {
                return [];
            }

            // B. Aggregate Offer Items
            const items = await OfferItem.aggregate([
                {
                    $match: {
                        offer_id: { $in: offerIds }
                    }
                },
                // Lookup Baseline Link (EstimateItem) - for Detailed
                {
                    $lookup: {
                        from: 'estimateitems',
                        localField: 'estimate_item_id',
                        foreignField: '_id',
                        as: 'estimate_item'
                    }
                },
                { $unwind: { path: '$estimate_item', preserveNullAndEmptyArrays: true } },

                // Lookup Price List Link (PriceListItem) - for Aggregated
                {
                    $lookup: {
                        from: 'pricelistitems',
                        localField: 'price_list_item_id',
                        foreignField: '_id',
                        as: 'price_item'
                    }
                },
                { $unwind: { path: '$price_item', preserveNullAndEmptyArrays: true } },

                // Lookup WBS Nodes 
                // Detailed: from estimate_item.wbs_ids
                // Aggregated: from price_item.wbs_ids (categories)
                {
                    $addFields: {
                        effective_wbs_ids: {
                            $ifNull: ['$estimate_item.wbs_ids', '$price_item.wbs_ids', []]
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'wbsnodes',
                        let: { wbs_ids: '$effective_wbs_ids' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $in: ['$_id', { $ifNull: ['$$wbs_ids', []] }] }
                                }
                            }
                        ],
                        as: 'wbs_nodes'
                    }
                },

                // Reshape to match Grid Config
                {
                    $addFields: {
                        // Keys
                        progressive: { $ifNull: ['$progressive', '$estimate_item.order', '$estimate_item.progressive'] },
                        code: { $ifNull: ['$code', '$price_item.code', '$estimate_item.code'] },

                        // Content
                        description: { $ifNull: ['$description', '$estimate_item.description', '$price_item.description'] },
                        unit_measure: { $ifNull: ['$unit_measure', '$estimate_item.unit_measure', '$price_item.unit'] },

                        // Hierarchy
                        wbs_hierarchy: {
                            $arrayToObject: {
                                $map: {
                                    input: '$wbs_nodes',
                                    as: 'node',
                                    in: {
                                        k: { $concat: ['wbs0', { $toString: '$$node.level' }] },
                                        v: '$$node.description'
                                    }
                                }
                            }
                        },

                        // Values -> mapped to 'project' for Grid compatibility
                        project: {
                            quantity: '$quantity',
                            unit_price: '$unit_price',
                            amount: {
                                $cond: {
                                    if: { $gt: ['$amount', 0] },
                                    then: { $toDouble: '$amount' },
                                    else: { $multiply: [{ $toDouble: '$quantity' }, { $toDouble: '$unit_price' }] }
                                }
                            }
                        }
                    }
                },
                { $sort: { progressive: 1, code: 1 } },
                {
                    $project: {
                        description: 1,
                        code: 1,
                        progressive: 1,
                        unit_measure: 1,
                        wbs_hierarchy: 1,
                        project: 1
                    }
                }
            ]);

            return serializeDocs(items);

        } else {
            // ---------------------------------------------------------
            // 2. BASELINE MODE (Existing Logic)
            // ---------------------------------------------------------
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
                        let: { wbs_ids: '$wbs_ids' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $in: ['$_id', { $ifNull: ['$$wbs_ids', []] }] },
                                    project_id: validProjectId,
                                    estimate_id: validEstimateId,
                                }
                            }
                        ],
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
                                            { $in: ['$level', [6, 7]] }
                                        ]
                                    },
                                    project_id: validProjectId,
                                    estimate_id: validEstimateId,
                                }
                            }
                        ],
                        as: 'pli_wbs_nodes'
                    }
                },
                {
                    $addFields: {
                        code: { $ifNull: ['$code', '$price_item.code'] },
                        description: {
                            $cond: {
                                if: { $in: ['$description', [null, '']] },
                                then: '$price_item.description',
                                else: '$description'
                            }
                        },
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
        }
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Error fetching estimate items',
            cause: error,
        });
    }
});
