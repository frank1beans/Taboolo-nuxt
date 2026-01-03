export type CommandPaletteItemKind = 'action' | 'page' | 'entity'

export type CommandPaletteEntityType = 'project' | 'estimate' | 'offer' | 'customer'

export type CommandPaletteItem = {
  id: string
  kind: CommandPaletteItemKind
  label: string
  description?: string
  category: string
  icon?: string
  keywords?: string[]
  shortcut?: string
  score?: number
  disabled?: boolean
  disabledReason?: string
  actionId?: string
  route?: string
  entityType?: CommandPaletteEntityType
  data?: Record<string, unknown>
}

export type CommandPaletteHistoryEntry = CommandPaletteItem & {
  lastUsedAt: number
}

export type CommandPaletteFavoriteEntry = CommandPaletteItem

export type CommandPaletteSection = {
  id: string
  label: string
  items: CommandPaletteItem[]
}
