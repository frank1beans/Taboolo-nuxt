 
import { Types } from 'mongoose';
import { PriceListItem } from '#models';

type CatalogEntry = {
    product_id?: string;
    code?: string;
    description?: string;
    extraDescription?: string;
    unit_id?: string | null;
    unit_label?: string | null;
    price?: number | null;
    wbs_id?: string | null;
    price_list_id?: string | null;
    source_preventivo_id?: string | null;
    import_run_id?: string | null;
    price_lists?: Record<string, number>;
};

/**
 * Upsert price catalog entries coming from SIX import.
 * Uses project_id + estimate_id + product_id as key.
 */
export async function upsertPriceCatalog(projectId: string, estimateId: string, catalog: CatalogEntry[] = []) {
    if (!catalog.length) return;

    const projectObjectId = new Types.ObjectId(projectId);
    const estimateObjectId = new Types.ObjectId(estimateId);
    const operations = catalog.map((entry) => {
        const productId = entry.product_id ?? entry.code;
        return {
            updateOne: {
                filter: { project_id: projectObjectId, estimate_id: estimateObjectId, product_id: productId },
                update: {
                    $set: {
                        project_id: projectObjectId,
                        estimate_id: estimateObjectId,
                        product_id: productId,
                        code: entry.code ?? '',
                        description: entry.description,
                        long_description: entry.extraDescription,
                        unit: entry.unit_id ?? entry.unit_label,
                        price: entry.price,
                        // wbs6_code: entry.wbs6_code, // Removed from schema
                        wbs_ids: [entry.wbs_id].filter(Boolean), // Approximation if wbs_id present
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

    await PriceListItem.bulkWrite(operations, { ordered: false });
}
