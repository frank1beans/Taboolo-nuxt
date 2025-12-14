/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import { PriceCatalogItem } from '#models';

type AnyRecord = Record<string, any>;

/**
 * Upsert price catalog entries coming from SIX import.
 * Uses project_id + product_id as key.
 */
export async function upsertPriceCatalog(projectId: string, catalog: AnyRecord[] = []) {
    if (!catalog.length) return;

    const projectObjectId = new Types.ObjectId(projectId);
    const operations = catalog.map((entry) => {
        const productId = entry.product_id ?? entry.code;
        return {
            updateOne: {
                filter: { project_id: projectObjectId, product_id: productId },
                update: {
                    $set: {
                        project_id: projectObjectId,
                        product_id: productId,
                        item_code: entry.code ?? '',
                        item_description: entry.description,
                        unit_id: entry.unit_id ?? entry.unit_label,
                        wbs6_code: entry.wbs6_code,
                        wbs7_code: entry.wbs7_code,
                        price_list_id: entry.price_list_id,
                        source_preventivo_id: entry.source_preventivo_id,
                        import_run_id: entry.import_run_id,
                        price_lists: entry.price_lists ?? {},
                    },
                },
                upsert: true,
            },
        };
    });

    await PriceCatalogItem.bulkWrite(operations, { ordered: false });
}
