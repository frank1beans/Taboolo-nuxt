import type { Project } from '#types'

export type ActionScope = 'global' | 'project' | 'estimate' | 'selection'
export type ActionTone = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export type ActionContext = {
  routePath?: string
  routeName?: string | null
  projectId?: string | null
  estimateId?: string | null
  selectionCount?: number
}

export type ActionHandler<TArgs extends unknown[] = unknown[], TResult = void> = (
  ...args: TArgs
) => TResult | Promise<TResult>

/**
 * Action definition for the central registry.
 * Register page-scoped actions on mount and unregister on unmount.
 * Use optional label/keywords/shortcut metadata for command palette search.
 */
export interface Action<TArgs extends unknown[] = unknown[], TResult = void> {
  id: string
  label?: string
  description: string
  category: string
  scope: ActionScope
  handler: ActionHandler<TArgs, TResult>
  /** Optional UI tone for buttons. */
  tone?: ActionTone
  /** Optional shortcut label (e.g. "Ctrl+K"). */
  shortcut?: string
  /** Optional keyword aliases for palette search. */
  keywords?: string[]
  /** Optional icon (heroicons/nuxt icon name). */
  icon?: string
  /** Optional sort order (lower = earlier). */
  order?: number
  /** Optional visibility predicate for command palette. */
  when?: (context: ActionContext) => boolean
  /** Optional enabled predicate for command palette. */
  isEnabled?: (context: ActionContext) => boolean
  /** Optional disabled reason shown in palette. */
  disabledReason?: string | ((context: ActionContext) => string | undefined)
}

export type ActionPaletteItem = {
  id: string
  label: string
  description?: string
  category: string
  scope: ActionScope
  shortcut?: string
  icon?: string
  score: number
  enabled: boolean
  disabledReason?: string
  action: Action
}

export type ChangeProjectStatusPayload = {
  projectId?: string
  status: Project['status']
}

/**
 * Known action IDs and their argument signatures.
 * Extend this map when adding new core actions to keep executeAction typed.
 */
export type ActionArgsMap = {
  'project.create': []
  'project.importOffers': []
  'grid.exportExcel': []
  'grid.resetFilters': []
  'estimate.compareOffers': []
  'estimate.importOffers': []
  'comparison.toggleWbsSidebar': []
  'catalog.resetFilters': []
  'catalog.toggleWbsSidebar': []
  'catalog.clearWbsSelection': []
  'pricelist.toggleWbsSidebar': []
  'pricelist.clearWbsSelection': []
  'projects.exportSelected': []
  'projects.deleteSelected': []
  'project.changeStatus': [payload: ChangeProjectStatusPayload]
}
