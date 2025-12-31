import { defineEventHandler } from 'h3';
import { EstimateItem } from '#models';
import { requireObjectIdParam, toObjectId } from '#utils/validate';

export default defineEventHandler(async (event) => {
    const projectId = requireObjectIdParam(event, 'id', 'Project ID');
    const estimateId = requireObjectIdParam(event, 'estimateId', 'Estimate ID');

    const validProjectId = toObjectId(projectId);
    const validEstimateId = toObjectId(estimateId);

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
