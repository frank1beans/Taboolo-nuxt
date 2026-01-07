import 'dotenv/config'; // Load .env file
import mongoose from 'mongoose';
import { PriceListItem } from '../models/price-list-item.schema.ts';
import { Project } from '../models/project.schema.ts';
import { WbsNode } from '../models/wbs.schema.ts';

const BATCH_SIZE = 1000;

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI is missing');
        process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected.');

    console.log('Loading Projects...');
    const projects = await Project.find({}).lean();
    const projectMap = new Map(projects.map(p => [p._id.toString(), p]));
    console.log(`Loaded ${projects.length} projects.`);

    console.log('Loading WBS Nodes...');
    // Optimization: If WBS nodes are too many, we might need to load per project or chunk.
    // Assuming they fit in memory for now (< 100k).
    const wbsNodes = await WbsNode.find({}).lean();
    const wbsMap = new Map(wbsNodes.map(n => [n._id.toString(), n]));
    console.log(`Loaded ${wbsNodes.length} WBS nodes.`);

    console.log('Starting Backfill...');
    const total = await PriceListItem.countDocuments({});
    console.log(`Total PriceListItems to process: ${total}`);

    let processed = 0;
    let updated = 0;
    const cursor = PriceListItem.find({}).cursor();

    const bulkOps: any[] = [];

    for await (const doc of cursor) {
        const changes: any = {};

        // 1. Denormalize Project Info
        if (doc.project_id) {
            const proj = projectMap.get(doc.project_id.toString());
            if (proj) {
                if (doc.project_name !== proj.name) changes.project_name = proj.name;
                if (doc.project_code !== proj.code) changes.project_code = proj.code;
                if (doc.business_unit !== proj.business_unit) changes.business_unit = proj.business_unit;
            }
        }

        // 2. Denormalize WBS Info
        if (doc.wbs_ids && doc.wbs_ids.length > 0) {
            // Find relevant WBS nodes
            // Logic: Look for WBS6 and WBS7 in the linked nodes or their ancestors?
            // Usually PriceListItem is linked to the lowest level (leaf).
            // We check the linked nodes.
            let foundWbs6 = false;
            let foundWbs7 = false;

            for (const wbsId of doc.wbs_ids) {
                const node = wbsMap.get(wbsId.toString());
                if (!node) continue;

                // Trace up if needed, or check current node category
                // Simple approach: Check if current node is wbs6/wbs7, or walk up ancestors if local info missing
                // But WbsNode schema has `wbs6_id`... not `wbs7_id` but `parent_id`.

                // Strategy:
                // If node.category is 'wbs06' -> use it.
                // If node.category is 'wbs07' -> use it, and use its parent or search for wbs06 ancestor?
                // Actually WbsNode schema has `wbs6_id`.

                if (node.category === 'wbs07' && !foundWbs7) {
                    changes.wbs7_code = node.code;
                    changes.wbs7_description = node.description;
                    foundWbs7 = true;

                    // If we have wbs7 node, it might have wbs6_id reference
                    if (node.wbs6_id) {
                        const wbs6 = wbsMap.get(node.wbs6_id.toString());
                        if (wbs6) {
                            changes.wbs6_code = wbs6.code;
                            changes.wbs6_description = wbs6.description;
                            foundWbs6 = true;
                        }
                    }
                } else if (node.category === 'wbs06' && !foundWbs6) {
                    changes.wbs6_code = node.code;
                    changes.wbs6_description = node.description;
                    foundWbs6 = true;
                }

                // Also check levels if category is missing
                if (node.level === 6 && !foundWbs6) { // Assuming level matches wbs number
                    changes.wbs6_code = node.code;
                    changes.wbs6_description = node.description;
                    foundWbs6 = true;
                }
                if (node.level === 7 && !foundWbs7) {
                    changes.wbs7_code = node.code;
                    changes.wbs7_description = node.description;
                    foundWbs7 = true;
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
            console.log(`Processed ${processed}/${total} items...`);
        }
    }

    if (bulkOps.length > 0) {
        await PriceListItem.bulkWrite(bulkOps);
    }

    console.log(`Finished. Processed: ${processed}, Updated: ${updated}`);
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
