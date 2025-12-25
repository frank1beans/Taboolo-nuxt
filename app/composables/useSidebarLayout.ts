import { computed, onMounted, ref, watch } from 'vue'

const STORAGE_KEY = 'app-shell:sidebar'
const DEFAULT_WIDTH = 280
const MIN_WIDTH = 240
const MAX_WIDTH = 420
const COLLAPSED_WIDTH = 72

const state = {
  initialized: ref(false),
  isCollapsed: ref(true),
  width: ref(DEFAULT_WIDTH),
  lastExpandedWidth: ref(DEFAULT_WIDTH),
}

const clampWidth = (value: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value))

export const useSidebarLayout = () => {
  const isCollapsed = state.isCollapsed
  const width = state.width
  const lastExpandedWidth = state.lastExpandedWidth

  const effectiveWidth = computed(() =>
    isCollapsed.value ? COLLAPSED_WIDTH : clampWidth(width.value),
  )

  const toggleCollapsed = () => {
    if (isCollapsed.value) {
      isCollapsed.value = false
      width.value = clampWidth(lastExpandedWidth.value || DEFAULT_WIDTH)
      return
    }
    lastExpandedWidth.value = clampWidth(width.value)
    isCollapsed.value = true
    width.value = COLLAPSED_WIDTH
  }

  const setWidth = (value: number) => {
    if (isCollapsed.value) return
    const next = clampWidth(value)
    width.value = next
    lastExpandedWidth.value = next
  }

  onMounted(() => {
    if (state.initialized.value) return

    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as {
          isCollapsed?: boolean
          width?: number
        }
        isCollapsed.value = Boolean(parsed.isCollapsed)
        lastExpandedWidth.value = clampWidth(parsed.width ?? DEFAULT_WIDTH)
        width.value = isCollapsed.value ? COLLAPSED_WIDTH : lastExpandedWidth.value
      } catch {
        width.value = DEFAULT_WIDTH
      }
    }

    state.initialized.value = true
  })

  watch(
    [isCollapsed, width, lastExpandedWidth],
    () => {
      if (!state.initialized.value) return
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          isCollapsed: isCollapsed.value,
          width: clampWidth(lastExpandedWidth.value),
        }),
      )
    },
    { deep: true },
  )

  return {
    isCollapsed,
    width: effectiveWidth,
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
    collapsedWidth: COLLAPSED_WIDTH,
    toggleCollapsed,
    setWidth,
  }
}
