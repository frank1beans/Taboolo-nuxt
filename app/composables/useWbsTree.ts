import { ref, computed, type Ref } from 'vue'

export interface WbsNode {
  id: string
  code: string
  name: string
  level: number
  children?: WbsNode[]
}

export interface WithWbsHierarchy {
  wbs_hierarchy?: {
    [key: string]: string | undefined
    wbs01?: string
    wbs02?: string
    wbs03?: string
    wbs04?: string
    wbs05?: string
    wbs06?: string
    wbs07?: string
  }
}

export function useWbsTree<T extends WithWbsHierarchy>(rowData: Ref<T[]>) {
  const selectedWbsNode = ref<WbsNode | null>(null)
  const wbsSidebarVisible = ref(true)

  const wbsNodes = computed<WbsNode[]>(() => {
    const nodeMap = new Map<string, WbsNode>()

    for (const item of rowData.value as T[]) {
      const hierarchy = item.wbs_hierarchy || {}
      let pathParts: string[] = []

      for (let level = 1; level <= 7; level++) {
        const key = `wbs0${level}`
        const value = hierarchy[key]

        if (!value) continue

        pathParts.push(value)
        const fullPath = pathParts.join('/')

        if (!nodeMap.has(fullPath)) {
          nodeMap.set(fullPath, {
            id: fullPath,
            code: value.length > 25 ? value.substring(0, 25) + '...' : value,
            name: value,
            level: level,
            children: [],
          })
        }

        if (pathParts.length > 1) {
          const parentPath = pathParts.slice(0, -1).join('/')
          const parentNode = nodeMap.get(parentPath)
          const currentNode = nodeMap.get(fullPath)!

          if (parentNode && !parentNode.children?.some(c => c.id === currentNode.id)) {
            parentNode.children = parentNode.children || []
            parentNode.children.push(currentNode)
          }
        }
      }
    }

    const rootNodes: WbsNode[] = []
    for (const [path, node] of nodeMap) {
      if (!path.includes('/')) {
        rootNodes.push(node)
      }
    }

    const sortChildren = (nodes: WbsNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name))
      for (const node of nodes) {
        if (node.children?.length) {
          sortChildren(node.children)
        }
      }
    }

    sortChildren(rootNodes)
    return rootNodes
  })

  const onWbsNodeSelected = (node: WbsNode | null) => {
    selectedWbsNode.value = node
  }

  const filteredRowData = computed(() => {
    if (!selectedWbsNode.value) {
      return rowData.value
    }

    const selectedPath = selectedWbsNode.value.id
    const pathSegments = selectedPath.split('/')

    return (rowData.value as T[]).filter(item => {
      const hierarchy = item.wbs_hierarchy || {}
      const itemPath: string[] = []

      for (let level = 1; level <= 7; level++) {
        const key = `wbs0${level}`
        const value = hierarchy[key]
        if (value) {
          itemPath.push(value)
        }
      }

      if (pathSegments.length > itemPath.length) {
        return false
      }

      for (let i = 0; i < pathSegments.length; i++) {
        if (itemPath[i] !== pathSegments[i]) {
          return false
        }
      }

      return true
    })
  })

  return {
    wbsNodes,
    selectedWbsNode,
    wbsSidebarVisible,
    filteredRowData,
    onWbsNodeSelected
  }
}
