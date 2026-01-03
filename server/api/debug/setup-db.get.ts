import { PriceListItem } from '#models/price-list-item.schema';
import { Project } from '#models/project.schema';
import { WbsNode } from '#models/wbs.schema';

export default defineEventHandler(async (event) => {
    const { action } = getQuery(event);

    const results: any = {
        indexes: 'skipped',
        backfill: 'skipped'
    };

    if (action === 'indexes') {
        try {
            const collection = PriceListItem.collection;
            try {
                await collection.dropIndex('code_text_description_text_long_description_text');
                results.dropped = 'dropped old text index';
            } catch (e: any) {
                results.dropped = `index not found or error: ${e.message}`;
            }

            await PriceListItem.createIndexes();
            results.indexes = 'created (re-run)';
        } catch (e: any) {
            results.indexes = `error: ${e.message}`;
        }
    }

    if (action === 'backfill') {
        const BATCH_SIZE = 500;
        const MAX_ITEMS = 50000;

        try {
            const projects = await Project.find({}).lean();
            const projectMap = new Map(projects.map((p: any) => [p._id.toString(), p]));

            const wbsNodes = await WbsNode.find({}).lean();
            const wbsMap = new Map(wbsNodes.map((n: any) => [n._id.toString(), n]));

            const cursor = PriceListItem.find({
                $or: [
                    { project_name: { $exists: false } },
                    { wbs6_code: { $exists: false } }
                ]
            }).cursor();

            const bulkOps: any[] = [];
            let processed = 0;
            let updated = 0;

            for await (const doc of cursor) {
                if (processed > MAX_ITEMS) break;

                const changes: any = {};
                const pId = doc.project_id?.toString();
                if (pId && projectMap.has(pId)) {
                    const proj = projectMap.get(pId);
                    if (proj) {
                        if (doc.project_name !== proj.name) changes.project_name = proj.name;
                        if (doc.project_code !== proj.code) changes.project_code = proj.code;
                        if (doc.business_unit !== proj.business_unit) changes.business_unit = proj.business_unit;
                    }
                }

                if (doc.wbs_ids && doc.wbs_ids.length > 0) {
                    let found6 = false;
                    let found7 = false;
                    for (const wbsId of doc.wbs_ids) {
                        const node = wbsMap.get(wbsId.toString());
                        if (!node) continue;
                        if ((node.category === 'wbs07' || node.level === 7) && !found7) {
                            changes.wbs7_code = node.code;
                            changes.wbs7_description = node.description;
                            found7 = true;
                            if (node.wbs6_id) {
                                const parent = wbsMap.get(node.wbs6_id.toString());
                                if (parent) {
                                    changes.wbs6_code = parent.code;
                                    changes.wbs6_description = parent.description;
                                    found6 = true;
                                }
                            }
                        }
                        if ((node.category === 'wbs06' || node.level === 6) && !found6) {
                            changes.wbs6_code = node.code;
                            changes.wbs6_description = node.description;
                            found6 = true;
                        }
                    }
                }

                if (Object.keys(changes).length > 0) {
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: doc._id },
                            update: { $set: changes }
                        }
                    });
                    updated++;
                }
                processed++;

                if (bulkOps.length >= BATCH_SIZE) {
                    await PriceListItem.bulkWrite(bulkOps);
                    bulkOps.length = 0;
                }
            }

            if (bulkOps.length > 0) {
                await PriceListItem.bulkWrite(bulkOps);
            }

            results.backfill = `processed ${processed}, updated ${updated}`;
        } catch (e: any) {
            results.backfill = `error: ${e.message}`;
        }
    }

    return results;
});
