import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { Project, Estimate } from '#types'

export interface TreeNode {
  id: string
  label: string
  icon?: string
  count?: number
  to?: string
  children?: TreeNode[]
  meta?: Record<string, any>
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
      const estId = est.id ? String(est.id) : null
      const isActive = est.id === estimate?.id
      const rounds = est.rounds ?? []
      const companies = est.companies ?? []
      const roundCount = est.roundsCount ?? rounds.length
      const companyCount = est.companiesCount ?? companies.length

      const children: TreeNode[] | undefined = isActive
        ? [
          {
            id: `price-list-${est.id}`,
            label: est.priceCatalog?.name || 'Listino',
            icon: 'heroicons:tag',
            to: estId ? `/projects/${project.id}/pricelist?estimateId=${estId}` : undefined,
          },
          {
            id: `comparison-${est.id}`,
            label: 'Confronto',
            icon: 'heroicons:arrow-path-rounded-square',
            to: estId ? `/projects/${project.id}/estimate/${estId}/comparison` : undefined,
          },
          {
            id: `rounds-${est.id}`,
            label: 'Rounds',
            icon: 'heroicons:arrows-up-down',
            count: roundCount,
            children: rounds.map((round, idx) => ({
              id: `round-${est.id}-${round.id || idx}`,
              label: round.name || `Round ${idx + 1}`,
              icon: 'heroicons:queue-list',
              to: estId ? `/projects/${project.id}/estimate/${estId}/offer?round=${round.id}` : undefined,
            })),
          },
          {
            id: `companies-${est.id}`,
            label: 'Imprese',
            icon: 'heroicons:building-office-2',
            count: companyCount,
            children: companies.map((company, idx) => ({
              id: `company-${est.id}-${company.id || idx}`,
              label: company.name || `Impresa ${idx + 1}`,
              icon: 'heroicons:building-office',
              to: estId ? `/projects/${project.id}/estimate/${estId}/offer?company=${encodeURIComponent(company.id)}` : undefined,
            })),
          },
        ]
        : undefined

      return {
        id: `estimate-${est.id}`,
        label: est.name || 'Preventivo',
        icon: isActive ? 'heroicons:document-check' : 'heroicons:document',
        to: estId ? `/projects/${project.id}/estimate/${estId}` : undefined,
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
            id: 'pricelist',
            label: 'Listini',
            icon: 'heroicons:currency-euro',
            count: estimates.length,
            children: estimates.map(est => ({
              id: `pricelist-${est.id}`,
              label: est.priceCatalog?.name || est.name || 'Listino',
              icon: 'heroicons:tag',
              to: `/projects/${project.id}/pricelist?estimateId=${est.id}`,
            })),
            // Fallback link if no children (optional, but good for UX if empty)
            to: estimates.length === 0 ? `/projects/${project.id}/pricelist` : undefined,
          },
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
