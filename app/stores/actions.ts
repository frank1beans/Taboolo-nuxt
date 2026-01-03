import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'
import type { Action, ActionArgsMap, ActionContext, ActionPaletteItem } from '~/types/actions'

/**
 * Action Registry
 * - Register actions from pages/components on mount and unregister via unregisterOwner on unmount.
 * - Use executeAction('action.id') in UI handlers instead of calling functions directly.
 * - For page-scoped actions, pass owner + overwrite: true so route changes do not drop actions.
 */
export const useActionsStore = defineStore('actions', () => {
  const actions = reactive<Record<string, Action>>({})
  const actionOwners = reactive<Record<string, string | undefined>>({})

  type RegisterOptions = {
    overwrite?: boolean
    owner?: string
  }

  const normalizeAction = (action: Action): Action => {
    return {
      ...action,
      label: action.label ?? action.description,
      keywords: action.keywords ?? [],
    }
  }

  const registerAction = (action: Action, options: RegisterOptions = {}) => {
    const normalized = normalizeAction(action)
    if (actions[normalized.id] && !options.overwrite) {
      console.warn(`[actions] Action "${normalized.id}" already registered.`)
      return false
    }
    actions[normalized.id] = normalized
    if (options.owner) {
      actionOwners[normalized.id] = options.owner
    } else if (actionOwners[normalized.id]) {
      delete actionOwners[normalized.id]
    }
    return true
  }

  const registerActions = (items: Action[], options: RegisterOptions = {}) => {
    const registered: string[] = []
    const skipped: string[] = []
    items.forEach((action) => {
      const ok = registerAction(action, options)
      if (ok) registered.push(action.id)
      else skipped.push(action.id)
    })
    return { registered, skipped }
  }

  const unregisterAction = (id: string) => {
    if (actions[id]) {
      delete actions[id]
    }
    if (actionOwners[id]) {
      delete actionOwners[id]
    }
  }

  const unregisterOwner = (owner: string) => {
    Object.entries(actionOwners).forEach(([id, actionOwner]) => {
      if (actionOwner === owner) unregisterAction(id)
    })
  }

  const getAction = (id: string) => actions[id]

  const listActions = computed(() => Object.values(actions))

  const sortActions = (list: Action[]) => {
    return [...list].sort((a, b) => {
      const orderA = a.order ?? 1000
      const orderB = b.order ?? 1000
      if (orderA !== orderB) return orderA - orderB
      const labelA = a.label ?? a.description
      const labelB = b.label ?? b.description
      return labelA.localeCompare(labelB)
    })
  }

  const actionsByCategory = computed(() => {
    const grouped = listActions.value.reduce<Record<string, Action[]>>((acc, action) => {
      if (!acc[action.category]) acc[action.category] = []
      acc[action.category]?.push(action)
      return acc
    }, {})
    Object.keys(grouped).forEach((category) => {
      grouped[category] = sortActions(grouped[category] ?? [])
    })
    return grouped
  })

  const normalizeQuery = (query: string) => query.trim().toLowerCase()

  const scoreText = (value: string, token: string) => {
    if (!value) return 0
    if (value.startsWith(token)) return 3
    if (value.includes(token)) return 1
    return 0
  }

  const scoreAction = (action: Action, query: string) => {
    const normalizedQuery = normalizeQuery(query)
    if (!normalizedQuery) return 0
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
    const label = (action.label ?? action.description).toLowerCase()
    const description = action.description.toLowerCase()
    const category = action.category.toLowerCase()
    const id = action.id.toLowerCase()
    const keywords = (action.keywords ?? []).map((keyword) => keyword.toLowerCase())

    let score = 0
    for (const token of tokens) {
      let tokenScore = 0
      tokenScore = Math.max(tokenScore, scoreText(label, token) * 3)
      tokenScore = Math.max(tokenScore, scoreText(id, token) * 2)
      tokenScore = Math.max(tokenScore, scoreText(category, token))
      tokenScore = Math.max(tokenScore, scoreText(description, token))
      if (keywords.some((keyword) => keyword.includes(token))) tokenScore += 1
      if (tokenScore === 0) return 0
      score += tokenScore
    }
    return score
  }

  const matchesScope = (action: Action, context: ActionContext) => {
    switch (action.scope) {
      case 'project':
        return Boolean(context.projectId)
      case 'estimate':
        return Boolean(context.estimateId)
      case 'selection':
        return typeof context.selectionCount === 'number' ? context.selectionCount > 0 : true
      default:
        return true
    }
  }

  const isActionAvailable = (action: Action, context: ActionContext) =>
    matchesScope(action, context) && (action.when ? action.when(context) : true)

  const isActionEnabled = (action: Action, context: ActionContext) =>
    action.isEnabled ? action.isEnabled(context) : true

  const resolveDisabledReason = (action: Action, context: ActionContext) => {
    if (!action.disabledReason) return undefined
    if (typeof action.disabledReason === 'function') {
      return action.disabledReason(context)
    }
    return action.disabledReason
  }

  const getPaletteItems = (
    query = '',
    context: ActionContext = {},
    options: { includeDisabled?: boolean; includeUnavailable?: boolean } = {},
  ): ActionPaletteItem[] => {
    const normalizedQuery = normalizeQuery(query)
    const items = listActions.value
      .map((action) => {
        const available = isActionAvailable(action, context)
        if (!available && !options.includeUnavailable) return null
        const enabled = available && isActionEnabled(action, context)
        if (!enabled && !options.includeDisabled) return null
        const score = normalizedQuery ? scoreAction(action, normalizedQuery) : 0
        if (normalizedQuery && score <= 0) return null

        return {
          id: action.id,
          label: action.label ?? action.description,
          description: action.description,
          category: action.category,
          scope: action.scope,
          shortcut: action.shortcut,
          icon: action.icon,
          score,
          enabled,
          disabledReason: enabled ? undefined : resolveDisabledReason(action, context),
          action,
        }
      })
      .filter((item): item is ActionPaletteItem => Boolean(item))

    const sorted = [...items].sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score
      const orderA = a.action.order ?? 1000
      const orderB = b.action.order ?? 1000
      if (orderA !== orderB) return orderA - orderB
      return a.label.localeCompare(b.label)
    })

    return sorted
  }

  function executeAction<TId extends keyof ActionArgsMap>(
    id: TId,
    ...args: ActionArgsMap[TId]
  ): Promise<unknown>
  function executeAction(id: string, ...args: unknown[]): Promise<unknown>
  async function executeAction(id: string, ...args: unknown[]) {
    const action = actions[id]
    if (!action) {
      console.warn(`[actions] Action "${id}" not found.`)
      return undefined
    }
    return await action.handler(...(args as unknown[]))
  }

  return {
    actions,
    listActions,
    actionsByCategory,
    registerAction,
    registerActions,
    unregisterAction,
    unregisterOwner,
    getAction,
    getPaletteItems,
    executeAction,
  }
})
