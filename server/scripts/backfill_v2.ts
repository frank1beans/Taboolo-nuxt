import 'dotenv/config';
import mongoose from 'mongoose';
import { PriceListItem } from '../models/price-list-item.schema.ts'; // .ts for jiti
import { Project } from '../models/project.schema.ts';
import { WbsNode } from '../models/wbs.schema.ts';

// Add .ts extension for jiti to work if needed, or remove if inferred.
// Actually, jiti handles extensions well usually.

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI missing');
    await mongoose.connect(uri);
    console.log('Connected.');

    // 1. FAST UPDATE for Projects
    console.log('Updating Projects...');
    const projects = await Project.find({}).lean();
    for (const p of projects) {
        // Bulk update all items for this project
        const res = await PriceListItem.updateMany(
            { project_id: p._id },
            {
                $set: {
                    project_name: p.name,
                    project_code: p.code,
                    business_unit: p.business_unit
                }
            }
        );
        console.log(`Project ${p.code}: updated ${res.modifiedCount} items`);
    }

    // 2. WBS Update (Complex, must iterate)
    console.log('Updating WBS...');
    const wbsNodes = await WbsNode.find({}).lean();
    const wbsMap = new Map(wbsNodes.map((n: any) => [n._id.toString(), n]));

    const items = await PriceListItem.find({ wbs_ids: { $not: { $size: 0 } }, wbs6_code: { $exists: false } }).select('_id wbs_ids').lean();
    console.log(`Found ${items.length} items needing WBS update.`);

    const bulkOps: any[] = [];
    let count = 0;

    for (const doc of items) {
        const changes: any = {};
        let found6 = false;
        let found7 = false;

        if (doc.wbs_ids && doc.wbs_ids.length > 0) {
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
        }

        if (bulkOps.length >= 1000) {
            await PriceListItem.bulkWrite(bulkOps);
            count += bulkOps.length;
            console.log(`WBS Processed: ${count}`);
            bulkOps.length = 0;
        }
    }

    if (bulkOps.length > 0) {
        await PriceListItem.bulkWrite(bulkOps);
        count += bulkOps.length;
    }

    console.log(`Total WBS updated: ${count}`);
    process.exit(0);
}

main().catch(console.error);
