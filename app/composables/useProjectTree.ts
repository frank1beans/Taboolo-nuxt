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
  defaultOpen?: boolean
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

    // Build detailed hierarchical structure for each estimate
    const estimateNodes: TreeNode[] = estimates.map((est) => {
      const estId = est.id ? String(est.id) : null
      const isActive = est.id === estimate?.id
      const rounds = est.rounds ?? []
      const companies = est.companies ?? []
      const roundCount = est.roundsCount ?? rounds.length
      const companyCount = est.companiesCount ?? companies.length

      // Build detailed children for each estimate
      const estimateChildren: TreeNode[] = [
        // Documents section
        {
          id: `docs-${est.id}`,
          label: 'Documenti preventivo',
          icon: 'heroicons:folder-open',
          defaultOpen: isActive,
          children: [
            {
              id: `detail-${est.id}`,
              label: 'Scheda preventivo',
              icon: 'heroicons:document-text',
              to: estId ? `/projects/${project.id}/estimate/${estId}/detail` : undefined,
            },
            {
              id: `worklist-${est.id}`,
              label: 'Lista lavorazioni',
              icon: 'heroicons:list-bullet',
              to: estId ? `/projects/${project.id}/pricelist?estimateId=${estId}` : undefined,
            },
          ],
        },
        // Gare e offerte section
        {
          id: `tenders-${est.id}`,
          label: 'Gare e offerta',
          icon: 'heroicons:shopping-bag',
          defaultOpen: isActive,
          children: rounds.map((round, idx) => ({
            id: `round-${est.id}-${round.id || idx}`,
            label: round.name ? `Gara: ${round.name}` : `Gara: Round ${idx + 1}`,
            icon: 'heroicons:flag',
            defaultOpen: isActive,
            children: (round.companies || companies).map((company, cIdx) => ({
              id: `company-${est.id}-${round.id || idx}-${company.id || cIdx}`,
              label: company.name ? `Impresa: ${company.name}` : `Impresa ${cIdx + 1}`,
              icon: 'heroicons:building-office',
              children: [
                {
                  id: `offer-worklist-${est.id}-${round.id || idx}-${company.id || cIdx}`,
                  label: 'Lista lavorazioni',
                  icon: 'heroicons:list-bullet',
                  to: estId && round.id && company.id
                    ? `/projects/${project.id}/pricelist?estimateId=${estId}&round=${round.id}&company=${encodeURIComponent(company.id)}`
                    : undefined,
                },
              ],
            })),
          })),
        },
        // Comparison
        {
          id: `comparison-${est.id}`,
          label: 'Confronto offerte',
          icon: 'heroicons:scale',
          to: estId ? `/projects/${project.id}/estimate/${estId}/comparison` : undefined,
        },
      ]

      return {
        id: `estimate-${est.id}`,
        label: est.name || 'Preventivo',
        icon: isActive ? 'heroicons:document-check' : 'heroicons:document-text',
        to: estId ? `/projects/${project.id}/estimate/${estId}` : undefined,
        defaultOpen: isActive,
        count: roundCount || companyCount ? Math.max(roundCount, companyCount) : undefined,
        children: estimateChildren,
      }
    })

    return [
      {
        id: `project-${project.id}`,
        label: project.name || 'Progetto',
        icon: 'heroicons:folder-open',
        to: `/projects/${project.id}`,
        defaultOpen: true,
        children: estimateNodes,
      },
    ]
  })

  return { treeNodes }
}
