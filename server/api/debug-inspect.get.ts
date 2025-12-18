import { defineEventHandler, getQuery } from 'h3';
import { Types } from 'mongoose';
import { Estimate, PriceList, PriceListItem, EstimateItem } from '#models';

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const projectId = query.projectId as string;
    const estimateId = query.estimateId as string;

    if (!projectId) {
        return { error: 'projectId required' };
    }

    const projectObjectId = new Types.ObjectId(projectId);
    const estimateObjectId = estimateId ? new Types.ObjectId(estimateId) : null;

    const stats: any = {};

    try {
        // 1. All Estimates in Project
        const estimates = await Estimate.find({ project_id: projectObjectId })
            .select('_id name price_list_id type is_baseline')
            .lean();
        stats.projectEstimates = estimates;

        // 2. All PriceLists in Project
        const priceLists = await PriceList.find({ project_id: projectObjectId })
            .select('_id name estimate_id')
            .lean();
        stats.projectPriceLists = priceLists;

        // 3. Global PriceListItems stats
        stats.totalPriceListItemsInProject = await PriceListItem.countDocuments({ project_id: projectObjectId });

        // 4. Check for items with missing estimate_id
        stats.priceListItemsWithoutEstimateId = await PriceListItem.countDocuments({
            project_id: projectObjectId,
            estimate_id: { $exists: false }
        });

        if (estimateObjectId) {
            // Specific Estimate Analysis
            const estDoc = await Estimate.findById(estimateObjectId).lean();

            stats.targetEstimate = {
                doc: estDoc,

                // Link Check: PriceList
                linkedPriceLists: await PriceList.find({
                    project_id: projectObjectId,
                    estimate_id: estimateObjectId
                }).select('_id name').lean(),

                // Link Check: PriceListItem by simple estimate_id match
                linkedPriceListItemsCount: await PriceListItem.countDocuments({
                    project_id: projectObjectId,
                    estimate_id: estimateObjectId
                }),

                // Link Check: EstimateItems match
                linkedEstimateItemsCount: await EstimateItem.countDocuments({
                    project_id: projectObjectId,
                    'project.estimate_id': estimateObjectId
                }),
            };

            // Sample PLIs for this estimate
            stats.targetEstimate.samplePLIs = await PriceListItem.find({
                project_id: projectObjectId,
                estimate_id: estimateObjectId
            }).limit(5).select('_id estimate_id price_list_id code').lean();
        }

        return stats;
    } catch (err) {
        return { error: err.message, stack: err.stack };
    }
});
