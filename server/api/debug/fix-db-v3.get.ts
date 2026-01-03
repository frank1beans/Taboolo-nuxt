import { PriceListItem } from '#models/price-list-item.schema';
export default defineEventHandler(async () => {
    const res: any = {};
    try {
        await PriceListItem.createIndexes();
        res.success = true;
    } catch (e: any) {
        res.error = e.message;
    }
    return res;
});
