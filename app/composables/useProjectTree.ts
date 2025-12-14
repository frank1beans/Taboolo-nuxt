import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { Project, Estimate } from '~/types/project'

export interface TreeNode {
  id: string
  label: string
  icon?: string
  count?: number
  to?: string
  children?: TreeNode[]
}

export const useProjectTree = (
  currentProject: MaybeRefOrGetter<Project | null | undefined>,
  currentEstimate: MaybeRefOrGetter<Estimate | null | undefined>,
) => {
  const treeNodes = computed<TreeNode[]>(() => {
    const project = toValue(currentProject)
    const estimate = toValue(currentEstimate)

    if (!project) return []

    const estimates = project.estimates ?? []

    const estimateNodes: TreeNode[] = estimates.map((est) => {
      const isActive = est.id === estimate?.id
      const rounds = est.rounds ?? []
      const companies = est.companies ?? []
      const roundCount = est.roundsCount ?? rounds.length
      const companyCount = est.companiesCount ?? companies.length

      const children: TreeNode[] | undefined = isActive
        ? [
          {
            id: `price-catalog-${est.id}`,
            label: est.priceCatalog?.name || 'Price Catalog',
            icon: 'heroicons:tag',
          },
          {
            id: `rounds-${est.id}`,
            label: 'Rounds',
            icon: 'heroicons:arrows-up-down',
            count: roundCount,
            children: rounds.map((round, idx) => ({
              id: `round-${round.id || `${est.id}-${idx}`}`,
              label: round.name || `Round ${idx + 1}`,
              icon: 'heroicons:queue-list',
            })),
          },
          {
            id: `companies-${est.id}`,
            label: 'Imprese',
            icon: 'heroicons:building-office-2',
            count: companyCount,
            children: companies.map((company, idx) => ({
              id: `company-${company.id || `${est.id}-${idx}`}`,
              label: company.name || `Impresa ${idx + 1}`,
              icon: 'heroicons:building-office',
            })),
          },
        ]
        : undefined

      return {
        id: `estimate-${est.id}`,
        label: est.name || 'Preventivo',
        icon: isActive ? 'heroicons:document-check' : 'heroicons:document',
        to: `/estimates/${est.id}`,
        count: roundCount || companyCount ? Math.max(roundCount, companyCount) : undefined,
        children,
      }
    })

    return [
      {
        id: `project-${project.id}`,
        label: project.name || 'Progetto',
        icon: 'heroicons:folder',
        to: `/projects/${project.id}`,
        children: [
          {
            id: 'estimates',
            label: 'Preventivi',
            icon: 'heroicons:document-duplicate',
            count: estimates.length,
            children: estimateNodes,
          },
        ],
      },
    ]
  })

  return { treeNodes }
}
