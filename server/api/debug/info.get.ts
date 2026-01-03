import { PriceListItem } from '#models/price-list-item.schema';

export default defineEventHandler(async (event) => {
    // Check count of items with project_name set
    const backfilledCount = await PriceListItem.countDocuments({ project_name: { $exists: true } });
    const total = await PriceListItem.countDocuments();

    return {
        backfilledCount,
        total,
        percent: total > 0 ? (backfilledCount / total * 100).toFixed(1) + '%' : '0%'
    };
});
