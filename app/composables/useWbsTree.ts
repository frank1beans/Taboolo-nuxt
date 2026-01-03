import { ref, computed, type Ref } from 'vue'
import type { WbsNode } from '~/types/wbs'

export type { WbsNode }

export interface WbsLevel {
  code: string
  name?: string
  level?: number
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

export function useWbsTree<T extends WithWbsHierarchy>(
  rowData: Ref<T[]>,
  options?: {
    getLevels?: (item: T) => WbsLevel[]
  }
) {
  const selectedWbsNode = ref<WbsNode | null>(null)

  const extractLevels = (item: T): WbsLevel[] => {
    if (options?.getLevels) {
      return (options.getLevels(item) || []).filter((lvl) => Boolean(lvl?.code))
    }

    const hierarchy = (item as WithWbsHierarchy).wbs_hierarchy || {}
    const levels: WbsLevel[] = []

    // GAP FILLING LOGIC (Specific User Request)
    // If wbs01 is missing but ANY other level (wbs02..wbs07) exists, inject a "(Nessuno)" Level 1
    // This groups orphaned items (starting at L2, L3, etc.) under a common "None" parent.
    const hasL1 = !!hierarchy['wbs01']
    let hasAnyOther = false

    if (!hasL1) {
      for (let i = 2; i <= 7; i++) {
        if (hierarchy[`wbs0${i}`]) {
          hasAnyOther = true
          break
        }
      }
    }

    if (!hasL1 && hasAnyOther) {
      levels.push({
        code: '(Nessuno)',
        name: '(Nessuno)',
        level: 1
      })
    }

    for (let level = 1; level <= 7; level++) {
      const key = `wbs0${level}`
      const value = hierarchy[key]

      if (value) {
        levels.push({
          code: value,
          name: value,
          level,
        })
      }
    }

    return levels
  }

  const wbsNodes = computed<WbsNode[]>(() => {
    const nodeMap = new Map<string, WbsNode>()

    for (const item of rowData.value as T[]) {
      const levels = extractLevels(item)
      const pathParts: string[] = []

      levels.forEach((lvl, index) => {
        if (!lvl.code) return

        pathParts.push(lvl.code)
        const fullPath = pathParts.join('/')
        const levelNumber = lvl.level ?? index + 1

        if (!nodeMap.has(fullPath)) {
          nodeMap.set(fullPath, {
            id: fullPath,
            code: lvl.code.length > 25 ? lvl.code.substring(0, 25) + '...' : lvl.code,
            name: lvl.name || lvl.code,
            level: levelNumber,
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
      })
    }

    const rootNodes: WbsNode[] = []
    for (const [path, node] of nodeMap) {
      if (!path.includes('/')) {
        rootNodes.push(node)
      }
    }

    const sortChildren = (nodes: WbsNode[]) => {
      nodes.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
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
      const itemPath = extractLevels(item).map((lvl) => lvl.code)

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
    filteredRowData,
    onWbsNodeSelected
  }
}
