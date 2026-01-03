import { QueryKeys } from '~/types/queries';
import { createQueryHandler, defineQuery } from '#utils/registry';
import { WbsNode } from '#models/wbs.schema';
import type { WbsNodeTree } from '~/types/queries';

export default createQueryHandler(defineQuery({
    id: QueryKeys.ESTIMATE_TREE,
    scope: 'public',
    handler: async (event, args) => {
        const { estimate_id } = args;

        const nodes = await WbsNode.find({ estimate_id })
            .sort({ level: 1, code: 1 })
            .lean();

        // Build Tree
        const nodeMap = new Map<string, WbsNodeTree>();
        const rootNodes: WbsNodeTree[] = [];

        // 1. Create all nodes
        nodes.forEach(n => {
            const id = n._id.toString();
            nodeMap.set(id, {
                id,
                label: n.description || n.code || 'Node',
                code: n.code,
                level: n.level,
                children: []
            });
        });

        // 2. Link parents
        nodes.forEach(n => {
            const id = n._id.toString();
            const node = nodeMap.get(id);
            if (!node) return;

            if (n.parent_id) {
                const parentId = n.parent_id.toString();
                const parent = nodeMap.get(parentId);
                if (parent) {
                    parent.children?.push(node);
                } else {
                    rootNodes.push(node);
                }
            } else {
                rootNodes.push(node);
            }
        });

        return {
            root: rootNodes
        };
    }
}));
