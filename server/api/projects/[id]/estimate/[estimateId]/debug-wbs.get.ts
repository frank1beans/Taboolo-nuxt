import { defineEventHandler, getRouterParam } from 'h3';
import { Types } from 'mongoose';
import { EstimateItem } from '#models';

export default defineEventHandler(async (event) => {
    const projectId = getRouterParam(event, 'id');
    const estimateId = getRouterParam(event, 'estimateId');

    const validProjectId = new Types.ObjectId(projectId!);
    const validEstimateId = new Types.ObjectId(estimateId!);

    // Get one sample item with full WBS details
    const sample = await EstimateItem.aggregate([
        {
            $match: {
                project_id: validProjectId,
                'project.estimate_id': validEstimateId
            }
        },
        { $limit: 1 },
        {
            $addFields: {
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
        {
            $lookup: {
                from: 'wbsnodes',
                localField: 'wbs_ids',
                foreignField: '_id',
                as: 'item_wbs_nodes'
            }
        },
        {
            $lookup: {
                from: 'wbsnodes',
                let: { pli_group_ids: '$price_item.groupIds' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $in: ['$_id', { $ifNull: ['$$pli_group_ids', []] }]
                            }
                        }
                    }
                ],
                as: 'pli_wbs_nodes'
            }
        }
    ]);

    return {
        sample: sample[0],
        item_wbs_count: sample[0]?.item_wbs_nodes?.length || 0,
        pli_wbs_count: sample[0]?.pli_wbs_nodes?.length || 0,
        item_wbs_sample: sample[0]?.item_wbs_nodes?.[0],
        pli_wbs_sample: sample[0]?.pli_wbs_nodes?.[0]
    };
});
