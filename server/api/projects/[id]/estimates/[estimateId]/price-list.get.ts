import { defineEventHandler, createError, getRouterParam, getQuery } from 'h3';
import mongoose from 'mongoose';
import { PriceListItem, Offer, OfferItem, EstimateItem } from '#models';
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

    // Check for Offer Filters
    const queryParams = getQuery(event);
    const round = queryParams.round ? Number(queryParams.round) : undefined;
    const company = queryParams.company as string | undefined;



    const query: any = {
      project_id: validProjectId,
      estimate_id: validEstimateId,
    };

    let aggregationPipeline: any[] = [{ $match: query }];

    if (round !== undefined || company) {
      // OFFER MODE
      const offerMatch: any = {
        project_id: validProjectId,
        estimate_id: validEstimateId
      };
      if (round !== undefined) offerMatch.round_number = round;
      if (company) offerMatch.company_name = company;

      const offers = await Offer.find(offerMatch).select('_id').lean();
      const offerIds = offers.map(o => o._id);

      // Hybrid Lookup:
      // 1. Find EstimateItems linked to this PriceListItem (to support Detailed offers that link to EstimateItem)
      // 2. Lookup OfferItems that map EITHER to this PriceListItem directly (Aggregated) OR via EstimateItems (Detailed)
      aggregationPipeline.push(
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
                      { $in: ['$offer_id', offerIds] },
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
        }
      );

      aggregationPipeline.push({
        $addFields: {
          total_quantity: { $sum: '$related_items.quantity' },
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
      });

    } else {
      // BASELINE MODE
      aggregationPipeline.push(
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
              }
            ],
            as: 'related_items'
          }
        },
        {
          $addFields: {
            total_quantity: { $sum: '$related_items.project.quantity' },
            // Fallback: If EstimateItems lack amount (legacy import), compute it from Quantity * PL Price
            total_amount: {
              $cond: {
                if: { $gt: [{ $sum: '$related_items.project.amount' }, 0] },
                then: { $sum: '$related_items.project.amount' },
                else: { $multiply: [{ $sum: '$related_items.project.quantity' }, '$price'] }
              }
            }
          }
        }
      );
    }

    aggregationPipeline.push(
      {
        $lookup: {
          from: 'wbsnodes',
          localField: 'wbs_ids',
          foreignField: '_id',
          as: 'wbs_nodes',
        },
      }
    );

    aggregationPipeline.push(
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
      { $project: { wbs_nodes: 0, wbs6_node: 0, wbs7_node: 0, related_items: 0 } },
      { $sort: { wbs6_code: 1, wbs7_code: 1, code: 1 } }
    );

    const items = await PriceListItem.aggregate(aggregationPipeline);

    return { items: serializeDocs(items) };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching price list',
      cause: error,
    });
  }
});
