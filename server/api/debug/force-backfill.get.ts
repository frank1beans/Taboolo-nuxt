import { PriceListItem } from '#models/price-list-item.schema';
import { Project } from '#models/project.schema';
import { WbsNode } from '#models/wbs.schema';

export default defineEventHandler(async (event) => {
    const start = performance.now();
    const results: any = {
        updated: 0,
        errors: []
    };

    try {
        // 1. Load context
        const projects = await Project.find({}).lean();
        const projectMap = new Map(projects.map((p: any) => [p._id.toString(), p]));

        const wbsNodes = await WbsNode.find({}).lean();
        const wbsMap = new Map(wbsNodes.map((n: any) => [n._id.toString(), n]));

        // 2. Load ALL items (2400 is small enough for RAM)
        const items = await PriceListItem.find({}).lean();

        const bulkOps: any[] = [];

        for (const doc of items) {
            const changes: any = {};
            const pId = doc.project_id?.toString();

            // Project Denorm
            if (pId && projectMap.has(pId)) {
                const proj = projectMap.get(pId);
                if (proj) {
                    // Always set if missing or different
                    if (doc.project_name !== proj.name) changes.project_name = proj.name;
                    if (doc.project_code !== proj.code) changes.project_code = proj.code;
                    if (doc.business_unit !== proj.business_unit) changes.business_unit = proj.business_unit;
                }
            }

            // WBS Denorm
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
                        // Try to find parent 6 from node
                        if (node.wbs6_id) {
                            const parent = wbsMap.get(node.wbs6_id.toString());
                            if (parent) {
                                changes.wbs6_code = parent.code;
                                changes.wbs6_description = parent.description;
                                found6 = true;
                            }
                        } else if (node.parent_id) {
                            const parent = wbsMap.get(node.parent_id.toString());
                            if (parent && (parent.category === 'wbs06' || parent.level === 6)) {
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
                        filter: { _id: (doc as any)._id },
                        update: { $set: changes }
                    }
                });
            }
        }

        if (bulkOps.length > 0) {
            const res = await PriceListItem.bulkWrite(bulkOps);
            results.updated = res.modifiedCount;
        }

    } catch (e: any) {
        results.errors.push(e.message);
    }

    const end = performance.now();
    results.time = `${(end - start).toFixed(2)}ms`;
    return results;
});
