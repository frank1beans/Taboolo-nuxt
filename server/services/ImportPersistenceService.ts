import { Types } from 'mongoose';
import { Project } from '../models/project.schema';
import { WbsNode } from '../models/wbs.schema';
import { PriceListItem } from '../models/price-list-item.schema';
import { Estimate } from '../models/estimate.schema';
import { EstimateItem } from '../models/estimate-item.schema';

interface PythonImportResult {
    project: any;
    groups: any[];
    price_list: any;
    estimate: any;
}

export async function persistImportResult(payload: PythonImportResult, projectId: string) {
    // Transaction removed for standalone support
    // const session = await Project.startSession(); 

    try {
        console.log(`[Persistence] Processing import for project ${projectId}...`);
        // NOTE: We no longer delete all project data. WBS and PriceListItems are upserted,
        // and EstimateItems are deleted only for the specific estimate being imported (line 163).

        // 1. Update Project (skip for now or basic update)

        // 2. Groups (WBS)
        // Map Python ID (UUID) -> Mongo ObjectId
        const groupMap = new Map<string, Types.ObjectId>();
        const rootNodes: any[] = [];
        const childNodes: any[] = [];

        // First pass: Allocate ObjectIds
        const debugGroupIds: string[] = [];
        if (payload.groups.length > 0) {
            console.log('[Persistence] First Group Object Keys:', Object.keys(payload.groups[0]));
            console.log('[Persistence] First Group Object:', JSON.stringify(payload.groups[0], null, 2));
        }
        for (const g of payload.groups) {
            const newId = new Types.ObjectId();
            const sourceId = g._id || g.id;
            groupMap.set(sourceId, newId);
            if (debugGroupIds.length < 20) debugGroupIds.push(sourceId);
        }
        // console.log(`[Persistence] Loaded ${groupMap.size} groups. Sample IDs:`, debugGroupIds);

        // Second pass: Prepare docs with mapped IDs
        const wbsDocs = payload.groups.map(g => {
            const mappedId = groupMap.get(g._id || g.id);
            const mappedParent = g.parentId ? groupMap.get(g.parentId) : undefined;

            return {
                _id: mappedId,
                project_id: projectId,
                parent_id: mappedParent,
                type: g.type || (g.level > 0 ? 'spatial' : 'commodity'), // Use parsed type or fallback
                level: g.level,
                code: g.code,
                description: g.description,
                ancestors: mappedParent ? [mappedParent] : [] // Simplistic, real ancestors need full traversal?
                // For now, let's trust the WbsService or assume flat-ish for speed, 
                // OR we fix ancestors logic. WbsNode requires ancestors? 
                // Schema: ancestors: [{ ref: 'WbsNode' }]
            };
        });

        // Clear existing WBS for this project? Or merge? 
        // Import usually implies overwrite or append. 
        // For "Raw Import", we often clear previous raw data. 
        // But WbsNode is shared? 
        // Let's assume we append/upsert.

        for (const doc of wbsDocs) {
            await WbsNode.findByIdAndUpdate(doc._id, doc, { upsert: true });
        }

        // 3. Price List (Header)
        const plData = payload.price_list;
        let priceListIdStr = 'default';
        if (plData) {
            const { PriceList } = await import('../models/price-list.schema');
            const newPl = await PriceList.create([{
                project_id: projectId,
                name: plData.name || 'Listino Importato',
                currency: plData.currency || 'EUR',
                is_default: true
            }]);
            priceListIdStr = newPl[0]._id.toString();
        }

        // 3b. Price List Items
        // Map Python Item ID -> Mongo ObjectId
        const priceItemMap = new Map<string, Types.ObjectId>();

        const priceListItems = payload.price_list?.items || [];
        console.log(`[Persistence] Processing ${priceListItems.length} price list items`);

        for (const item of priceListItems) {
            priceItemMap.set(item._id || item.id, new Types.ObjectId());
        }

        const priceListDocs = priceListItems.map((item: any) => {
            const mappedId = priceItemMap.get(item._id || item.id);
            // Payload alias: wbs_ids in Python -> wbsIds in JSON, OR depends on alias setting.
            // Python 'alias' parameter works for export by_alias=True (which is default usually?)
            // Let's check both to be safe: item.wbs_ids || item.wbsIds || item.groupIds (legacy)
            const rawGroups = item.wbsIds || item.wbs_ids || item.groupIds || [];
            const mappedGroups = rawGroups.map((gid: string) => groupMap.get(gid)).filter(Boolean);

            return {
                _id: mappedId,
                project_id: projectId,
                code: item.code,
                description: item.description,
                long_description: item.longDescription || item.long_description || item.extraDescription,
                unit: item.unit,
                price: item.price,
                price_list_id: priceListIdStr,
                wbs_ids: mappedGroups,
                // price_lists: { "default": item.price }
            };
        });

        if (priceListDocs.length > 0) {
            // await PriceListItem.findByIdAndUpdate(priceListDocs[0]._id, priceListDocs[0], { upsert: true }); // Test one? No, loop
            for (const doc of priceListDocs) {
                await PriceListItem.findByIdAndUpdate(doc._id, doc, { upsert: true });
            }
        }

        // 4. Estimate
        // Ensure one exists
        const estData = payload.estimate;
        let estimateId: Types.ObjectId;

        // We try to find by some key or create new
        const existingEst = await Estimate.findOne({ project_id: projectId, name: estData.name });
        if (existingEst) {
            estimateId = existingEst._id as Types.ObjectId;
            // Update fields
        } else {
            estimateId = new Types.ObjectId();
            await Estimate.create([{
                _id: estimateId,
                project_id: projectId,
                name: estData.name,
                type: 'project', // Default
                is_baseline: true,
                total_amount: 0 // Calc later
            }]);
        }

        // 5. Estimate Items
        const estItems = estData.items || [];
        console.log(`[Persistence] Processing ${estItems.length} estimate items`);

        // Clear existing items for this estimate to avoid dupes?
        await EstimateItem.deleteMany({ 'project.estimate_id': estimateId });

        // Build efficient Price Value Map
        const priceValueMap = new Map<string, number>();
        for (const pli of priceListItems) {
            priceValueMap.set(pli._id || pli.id, pli.price || 0);
        }

        const itemDocs = estItems.map((item: any) => {
            const rawGroups = item.wbsIds || item.wbs_ids || item.groupIds || [];
            const mappedGroups = rawGroups.map((gid: string) => groupMap.get(gid)).filter(Boolean);

            // Resolve price (still needed for amount calculation? Or should we store 0?)
            // We keep price as it's transactional.
            const itemPrice = priceValueMap.get(item.priceListItemId || item.price_list_item_id) || 0;
            const quantity = item.quantity || item.total_quantity || 0;

            const rawPliId = item.priceListItemId || item.price_list_item_id;
            const mappedPliId = priceItemMap.get(rawPliId);
            const finalPliId = mappedPliId ? mappedPliId.toString() : rawPliId;

            return {
                project_id: projectId,
                price_list_item_id: finalPliId,
                related_item_id: item.relatedItemId || item.related_item_id,
                wbs_ids: mappedGroups,

                // Only save overrides if present in payload (rare for import, usually null)
                code: item.code,
                description: item.description,
                unit: item.unit,
                progressive: item.progressive,

                project: {
                    estimate_id: estimateId,
                    quantity: quantity,
                    // unit_price: itemPrice, 
                    // amount: quantity * itemPrice,
                    measurements: item.measurements || []
                },
                offers: []
            };
        }).filter(Boolean);

        console.log(`[Persistence] Saving ${itemDocs.length} valid items to DB`);
        await EstimateItem.insertMany(itemDocs);

        console.log(`[Persistence] DEBUG GROUPS: Loaded ${groupMap.size} groups.`);
        console.log(`[Persistence] First 20 Group IDs available in Map:`, JSON.stringify(debugGroupIds));

        // await session.commitTransaction();

        return {
            success: true,
            summary: {
                groups: wbsDocs.length,
                products: priceListDocs.length,
                items: itemDocs.length
            }
        };

    } catch (error) {
        // await session.abortTransaction();
        throw error;
    } finally {
        // session.endSession();
    }
}
