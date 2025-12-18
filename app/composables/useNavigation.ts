import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { Project, Estimate } from '~/types/project'
import type { TreeNode } from '~/composables/useProjectTree'

export const useNavigation = (
    currentProject: MaybeRefOrGetter<Project | null | undefined>,
    currentEstimate: MaybeRefOrGetter<Estimate | null | undefined>,
) => {
    // 1. GLOBAL Context Nodes (always visible)
    const globalNodes = computed<TreeNode[]>(() => {
        return [
            {
                id: 'home',
                label: 'Home',
                icon: 'heroicons:home',
                to: '/',
            },
            {
                id: 'projects',
                label: 'Progetti',
                icon: 'heroicons:folder',
                to: '/projects',
            },
            {
                id: 'catalogs',
                label: 'Listini Generali',
                icon: 'heroicons:book-open',
                to: '/catalogs',
            }
        ]
    })

    // 2. PROJECT Context Nodes (visible when a project is selected)
    const contextNodes = computed<TreeNode[]>(() => {
        const project = toValue(currentProject)
        const estimate = toValue(currentEstimate)

        if (!project) return []

        const estimates = project.estimates ?? []

        // 2. Secondary View: Estimates (Preventivi) - Nested
        const estimateNodes: TreeNode[] = estimates.map((est) => {
            const estId = est.id ? String(est.id) : null
            const isActive = est.id === estimate?.id
            const rounds = est.rounds ?? []
            const companies = est.companies ?? []
            const roundCount = est.roundsCount ?? rounds.length
            const companyCount = est.companiesCount ?? companies.length

            // 1. Estimate Root Children (Preventivo + Work List)
            const children: TreeNode[] | undefined = isActive
                ? [
                    // Folder Progetto: raccoglie preventivo e lista lavorazioni
                    {
                        id: `estimate-${est.id}-project-folder`,
                        label: 'Progetto',
                        icon: 'heroicons:folder-open',
                        children: [
                            {
                                id: `estimate-${est.id}-detail`,
                                label: 'Preventivo',
                                icon: 'heroicons:document-text',
                                to: estId ? `/projects/${project.id}/estimate/${estId}/detail` : undefined,
                            },
                            {
                                id: `estimate-${est.id}-pricelist`,
                                label: 'Lista Lavorazioni',
                                icon: 'heroicons:list-bullet',
                                to: estId ? `/projects/${project.id}/pricelist?estimateId=${estId}` : undefined,
                            },
                        ],
                    },
                    // Gare & Offerte (Group)
                    {
                        id: `tenders-${est.id}`,
                        label: 'Gare & Offerte',
                        icon: 'heroicons:shopping-bag', // Bag or similar for Tenders
                        children: [
                            // Rounds
                            ...rounds.map((round, idx) => ({
                                id: `round-${est.id}-${round.id || idx}`,
                                label: round.name || `Round ${idx + 1}`,
                                icon: 'heroicons:queue-list',
                                children: (round.companies || []).map((company, cIdx) => {
                                    const companyChildren: TreeNode[] = [
                                        {
                                            id: `offer-${est.id}-${round.id}-${company.id}-pricelist`,
                                            label: 'Lista Lavorazioni',
                                            icon: 'heroicons:list-bullet',
                                            to: estId ? `/projects/${project.id}/pricelist?estimateId=${estId}&round=${round.id}&company=${encodeURIComponent(company.id)}` : undefined,
                                        }
                                    ];

                                    if (company.offerMode === 'detailed') {
                                        companyChildren.push({
                                            id: `offer-${est.id}-${round.id}-${company.id}-detail`,
                                            label: 'Preventivo',
                                            icon: 'heroicons:document-text',
                                            to: estId ? `/projects/${project.id}/estimate/${estId}/offer?round=${round.id}&company=${encodeURIComponent(company.id)}` : undefined,
                                        });
                                    }

                                    return {
                                        id: `company-${est.id}-${round.id}-${company.id || cIdx}`,
                                        label: company.name || `Impresa ${cIdx + 1}`,
                                        icon: 'heroicons:building-office',
                                        children: companyChildren
                                    };
                                })
                            }))
                        ]
                    },
                    // Confronto visibile fuori dal gruppo offerte
                    {
                        id: `comparison-${est.id}`,
                        label: 'Confronto',
                        icon: 'heroicons:scale',
                        to: estId ? `/projects/${project.id}/estimate/${estId}/comparison` : undefined,
                    }
                ]
                : undefined

            return {
                id: `estimate-${est.id}`,
                label: est.name || 'Preventivo',
                icon: isActive ? 'heroicons:folder-open' : 'heroicons:folder',
                to: estId ? `/projects/${project.id}/estimate/${estId}` : undefined,
                defaultOpen: isActive,
                count: roundCount || companyCount ? Math.max(roundCount, companyCount) : undefined,
                children,
            }
        })

        return [
            {
                id: `project-${project.id}`,
                label: project.name || 'Progetto',
                icon: 'heroicons:folder-open',
                to: `/projects/${project.id}`,
                children: [
                    // Removed top-level Work List node as requested
                    ...estimateNodes,
                ],
            },
        ]
    })

    return { globalNodes, contextNodes }
}
