import { PriceListItem } from '#models/price-list-item.schema';
export default defineEventHandler(async (event) => {
    const collection = PriceListItem.collection;
    const res: any = {};

    // 1. Drop Conflict
    try {
        await collection.dropIndex('code_text_description_text_long_description_text_extended_description_text').catch(() => { }); // Drop if new one exists partially?
        await collection.dropIndex('code_text_description_text_long_description_text'); // Old one
        res.dropped = true;
    } catch (e: any) {
        res.dropped_error = e.message;
    }

    // 2. Create Indexes
    try {
        // Explicitly creating scalar indexes first to ensure speed
        await collection.createIndex({ code: 1 }, { name: 'code_1_optimize' });
        await collection.createIndex({ project_id: 1, code: 1 }, { name: 'project_code_1_optimize' });

        // Then all (schema defined)
        await PriceListItem.createIndexes();
        res.created = true;
    } catch (e: any) {
        res.created_error = e.message;
    }

    // 3. Trigger Backfill (Async background?)
    // We won't wait for backfill here to avoid timeout, just acknowledge indexes.
    // User complained about slowness -> indexes are key.

    return res;
});
