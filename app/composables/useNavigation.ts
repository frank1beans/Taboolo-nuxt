import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { Project, Estimate } from '#types'
import type { TreeNode } from '~/composables/useProjectTree'

type NavigationNodeType =
    | 'project'
    | 'estimate'
    | 'estimate-section'
    | 'estimate-detail'
    | 'estimate-worklist'
    | 'tenders'
    | 'round'
    | 'company'
    | 'offer-detail'
    | 'offer-worklist'
    | 'comparison'

type NavigationNode = TreeNode & {
    meta?: {
        type?: NavigationNodeType
        subtitle?: string
        hint?: string
    }
    defaultOpen?: boolean
}

export const useNavigation = (
    currentProject: MaybeRefOrGetter<Project | null | undefined>,
    currentEstimate: MaybeRefOrGetter<Estimate | null | undefined>,
) => {
    // 1. GLOBAL Context Nodes (always visible)
    const globalNodes = computed<NavigationNode[]>(() => {
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
                id: 'analytics',
                label: 'Analytics',
                icon: 'heroicons:chart-bar-square',
                to: '/analytics',
            },
            {
                id: 'catalogs',
                label: 'Listini Generali',
                icon: 'heroicons:book-open',
                to: '/catalogs',
            },
            {
                id: 'price-estimator',
                label: 'Stima Prezzi',
                icon: 'heroicons:calculator',
                to: '/price-estimator',
            }
        ]
    })

    // 2. PROJECT Context Nodes (visible when a project is selected)
    const contextNodes = computed<NavigationNode[]>(() => {
        const project = toValue(currentProject)
        const estimate = toValue(currentEstimate)

        if (!project) return []

        const projectId = String(project.id)
        const estimates = project.estimates ?? []

        // 2. Secondary View: Estimates (Preventivi) - Nested
        const estimateNodes: NavigationNode[] = estimates.map((est, estIndex) => {
            const rawEstId = est.id ? String(est.id) : null
            const estId = (rawEstId && rawEstId !== 'null' && rawEstId !== 'undefined') ? rawEstId : null
            const estKey = estId ?? `idx-${estIndex}`

            const isActive = est.id === estimate?.id
            const rounds = est.rounds ?? []
            const companies = est.companies ?? []
            const roundCount = est.roundsCount ?? rounds.length
            const companyCount = est.companiesCount ?? companies.length

            // 1. Estimate Root Children (Preventivo + Work List)
            const children: NavigationNode[] | undefined = isActive
                ? [
                    // Folder Progetto: raccoglie preventivo e lista lavorazioni
                    {
                        id: `estimate-section:${estKey}`,
                        label: 'Documenti preventivo',
                        icon: 'heroicons:folder-open',
                        meta: { type: 'estimate-section', subtitle: 'Preventivo' },
                        children: [
                            {
                                id: `estimate-detail:${estKey}`,
                                label: 'Scheda preventivo',
                                icon: 'heroicons:document-text',
                                meta: { type: 'estimate-detail', subtitle: 'Dettaglio' },
                                to: estId ? `/projects/${project.id}/estimate/${estId}/detail` : undefined,
                            },
                            {
                                id: `estimate-worklist:${estKey}`,
                                label: 'Lista lavorazioni',
                                icon: 'heroicons:list-bullet',
                                meta: { type: 'estimate-worklist', subtitle: 'Lavorazioni' },
                                to: estId ? `/projects/${project.id}/pricelist?estimateId=${estId}` : undefined,
                            },
                        ],
                    },
                    // Gare & Offerte (Group)
                    {
                        id: `tenders:${estKey}`,
                        label: 'Gare e offerte',
                        icon: 'heroicons:shopping-bag',
                        meta: { type: 'tenders', subtitle: 'Offerte' },
                        children: [
                            // Rounds
                            ...rounds.map((round, idx) => {
                                const roundId = round.id ? String(round.id) : null
                                const roundKey = roundId ?? `idx-${idx}`

                                return {
                                    id: `round:${estKey}:${roundKey}`,
                                    label: round.name ? `Gara: ${round.name}` : `Gara ${idx + 1}`,
                                    icon: 'heroicons:flag',
                                    meta: { type: 'round', subtitle: 'Gara' },
                                    children: (round.companies || []).map((company, cIdx) => {
                                        const companyId = company.id ? encodeURIComponent(String(company.id)) : null
                                        const companyKey = companyId ?? `idx-${cIdx}`
                                        const companyChildren: NavigationNode[] = [
                                            {
                                                id: `offer-worklist:${estKey}:${roundKey}:${companyKey}`,
                                                label: 'Lista lavorazioni',
                                                icon: 'heroicons:list-bullet',
                                                meta: { type: 'offer-worklist', subtitle: 'Offerta' },
                                                to: (estId && round.id && company.id) ? `/projects/${project.id}/pricelist?estimateId=${estId}&round=${round.id}&company=${encodeURIComponent(company.id)}` : undefined,
                                            }
                                        ];

                                        if (company.offerMode === 'detailed') {
                                            companyChildren.push({
                                                id: `offer-detail:${estKey}:${roundKey}:${companyKey}`,
                                                label: 'Preventivo offerta',
                                                icon: 'heroicons:document-text',
                                                meta: { type: 'offer-detail', subtitle: 'Offerta' },
                                                to: (estId && round.id && company.id) ? `/projects/${project.id}/estimate/${estId}/offer?round=${round.id}&company=${encodeURIComponent(company.id)}` : undefined,
                                            });
                                        }

                                        return {
                                            id: `company:${estKey}:${roundKey}:${companyKey}`,
                                            label: company.name ? `Impresa: ${company.name}` : `Impresa ${cIdx + 1}`,
                                            icon: 'heroicons:building-office',
                                            meta: { type: 'company', subtitle: 'Impresa' },
                                            children: companyChildren
                                        };
                                    })
                                }
                            })
                        ]
                    },
                    // Confronto visibile fuori dal gruppo offerte
                    {
                        id: `comparison:${estKey}`,
                        label: 'Confronto offerte',
                        icon: 'heroicons:scale',
                        meta: { type: 'comparison', subtitle: 'Confronto' },
                        to: estId ? `/projects/${project.id}/estimate/${estId}/comparison` : undefined,
                    }
                ]
                : undefined

            return {
                id: `estimate:${estKey}`,
                label: est.name || 'Preventivo',
                icon: isActive ? 'heroicons:document-check' : 'heroicons:document-text',
                to: estId ? `/projects/${project.id}/estimate/${estId}` : undefined,
                defaultOpen: isActive,
                count: roundCount || companyCount ? Math.max(roundCount, companyCount) : undefined,
                meta: { type: 'estimate', subtitle: 'Preventivo', hint: 'Vista Preventivi' },
                children,
            }
        })

        return [
            {
                id: `project:${projectId}`,
                label: project.name || 'Progetto',
                icon: 'heroicons:folder-open',
                meta: { type: 'project', subtitle: 'Progetto' },
                to: `/projects/${projectId}`,
                defaultOpen: true,
                children: [
                    ...estimateNodes,
                ],
            },
        ]
    })

    return { globalNodes, contextNodes }
}
