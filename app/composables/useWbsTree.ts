import { ref } from 'vue';
import type { WbsNode, WbsTreeState } from '~/types/wbs';

export function useWbsTree(projectId?: string, estimateId?: string) {
  const nodes = ref<WbsNode[]>([]);
  const loading = ref(false);
  const selectedNode = ref<WbsNode | null>(null);
  const expandedNodes = ref<Set<string>>(new Set());

  const fetchWbsTree = async (pid: string, estId?: string) => {
    loading.value = true;
    try {
      if (!estId) throw new Error('estimateId is required for WBS');
      const response = await $fetch(`/api/projects/${pid}/estimates/${estId}/wbs`);

      // Build tree structure
      const allNodes = [
        ...(response.spatial || []),
        ...(response.wbs6 || []),
        ...(response.wbs7 || []),
      ];

      // Convert to tree
      nodes.value = buildTree(allNodes);
    } catch (error) {
      console.error('Error fetching WBS tree:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const buildTree = (flatNodes: WbsNode[]): WbsNode[] => {
    const nodeMap = new Map<string, WbsNode>();
    const rootNodes: WbsNode[] = [];

    // Create node map
    flatNodes.forEach((node) => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    // Build tree
    flatNodes.forEach((node) => {
      const treeNode = nodeMap.get(node.id)!;

      if (node.parent_id) {
        const parent = nodeMap.get(node.parent_id);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(treeNode);
        } else {
          rootNodes.push(treeNode);
        }
      } else {
        rootNodes.push(treeNode);
      }
    });

    // Sort children by level and code
    const sortChildren = (node: WbsNode) => {
      if (node.children && node.children.length > 0) {
        node.children.sort((a, b) => {
          if (a.level !== b.level) return a.level - b.level;
          return a.code.localeCompare(b.code);
        });
        node.children.forEach(sortChildren);
      }
    };

    rootNodes.forEach(sortChildren);

    return rootNodes.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.code.localeCompare(b.code);
    });
  };

  const toggleExpand = (nodeId: string) => {
    if (expandedNodes.value.has(nodeId)) {
      expandedNodes.value.delete(nodeId);
    } else {
      expandedNodes.value.add(nodeId);
    }
  };

  const expandAll = () => {
    const collectIds = (nodes: WbsNode[]): string[] => {
      return nodes.flatMap((node) => [
        node.id,
        ...(node.children ? collectIds(node.children) : []),
      ]);
    };
    expandedNodes.value = new Set(collectIds(nodes.value));
  };

  const collapseAll = () => {
    expandedNodes.value.clear();
  };

  const selectNode = (node: WbsNode | null) => {
    selectedNode.value = node;
  };

  const findNode = (nodeId: string, searchNodes = nodes.value): WbsNode | null => {
    for (const node of searchNodes) {
      if (node.id === nodeId) return node;
      if (node.children) {
        const found = findNode(nodeId, node.children);
        if (found) return found;
      }
    }
    return null;
  };

  // Auto-fetch if projectId provided
  if (projectId && estimateId) {
    fetchWbsTree(projectId, estimateId);
  }

  return {
    nodes,
    loading,
    selectedNode,
    expandedNodes,
    fetchWbsTree,
    toggleExpand,
    expandAll,
    collapseAll,
    selectNode,
    findNode,
  };
}
