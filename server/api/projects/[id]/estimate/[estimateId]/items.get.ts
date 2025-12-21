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
            const offerMatch: Record<string, unknown> = {
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
                {
                    $addFields: {
                        estimate_item_oid: {
                            $cond: {
                                if: { $eq: [{ $type: '$estimate_item_id' }, 'string'] },
                                then: { $toObjectId: '$estimate_item_id' },
                                else: '$estimate_item_id'
                            }
                        }
                    }
                },
                // Lookup Baseline Link (EstimateItem) - for Detailed
                {
                    $lookup: {
                        from: 'estimateitems',
                        localField: 'estimate_item_oid',
                        foreignField: '_id',
                        as: 'estimate_item'
                    }
                },
                { $unwind: { path: '$estimate_item', preserveNullAndEmptyArrays: true } },

                // Resolve effective price list item id (offer if present, else from estimate item)
                {
                    $addFields: {
                        effective_price_list_item_id: {
                            $ifNull: ['$price_list_item_id', '$estimate_item.price_list_item_id']
                        }
                    }
                },

                // Normalize effective price list id to ObjectId when stored as string (baseline stores string)
                {
                    $addFields: {
                        effective_price_list_item_oid: {
                            $cond: {
                                if: { $eq: [{ $type: '$effective_price_list_item_id' }, 'string'] },
                                then: { $toObjectId: '$effective_price_list_item_id' },
                                else: '$effective_price_list_item_id'
                            }
                        }
                    }
                },

                // Lookup Price List Link (PriceListItem) - for Aggregated
                {
                    $lookup: {
                        from: 'pricelistitems',
                        localField: 'effective_price_list_item_oid',
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
                            $setUnion: [
                                { $ifNull: ['$estimate_item.wbs_ids', []] },
                                { $ifNull: ['$price_item.wbs_ids', []] }
                            ]
                        },
                    }
                },
                // Normalize WBS ids to ObjectId for lookup
                {
                    $addFields: {
                        effective_wbs_ids_oid: {
                            $map: {
                                input: '$effective_wbs_ids',
                                as: 'wid',
                                in: {
                                    $cond: {
                                        if: { $eq: [{ $type: '$$wid' }, 'string'] },
                                        then: { $toObjectId: '$$wid' },
                                        else: '$$wid'
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'wbsnodes',
                        let: { wbs_ids: '$effective_wbs_ids_oid' },
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
                        progressive: {
                            $ifNull: [
                                '$progressive',
                                { $ifNull: ['$estimate_item.progressive', '$estimate_item.order'] }
                            ]
                        },
                        code: {
                            $cond: {
                                if: { $eq: ['$source', 'aggregated'] },
                                then: { $ifNull: ['$price_item.code', null] },
                                else: { $ifNull: ['$estimate_item.code', { $ifNull: ['$price_item.code', null] }] }
                            }
                        },

                        // Content
                        description: {
                            $ifNull: [
                                '$price_item.description',
                                '$price_item.long_description',
                                '$price_item.code'
                            ]
                        },
                        unit_measure: { $ifNull: ['$price_item.unit', null] }
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
        } else {
            // ---------------------------------------------------------
            // 2. PROJECT MODE (Baseline)
            // ---------------------------------------------------------
            // Fetch EstimateItems directly
            const items = await EstimateItem.aggregate([
                {
                    $match: {
                        project_id: validProjectId,
                        'project.estimate_id': validEstimateId
                    }
                },
                {
                    $lookup: {
                        from: 'pricelistitems',
                        let: { pli_id: { $toObjectId: '$price_list_item_id' } }, // stored as string
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$pli_id'] } } }
                        ],
                        as: 'price_item'
                    }
                },
                { $unwind: { path: '$price_item', preserveNullAndEmptyArrays: true } },

                // Lookup WBS Nodes
                {
                    $addFields: {
                        wbs_ids_oid: {
                            $map: {
                                input: { $ifNull: ['$wbs_ids', []] },
                                as: 'wid',
                                in: { $toObjectId: '$$wid' }
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'wbsnodes',
                        localField: 'wbs_ids_oid',
                        foreignField: '_id',
                        as: 'wbs_nodes'
                    }
                },

                // Reshape
                {
                    $addFields: {
                        // Inherit description from PLI if not override
                        description: {
                            $ifNull: [
                                '$description',
                                '$price_item.description',
                                '$price_item.long_description'
                            ]
                        },
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
                        }
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
