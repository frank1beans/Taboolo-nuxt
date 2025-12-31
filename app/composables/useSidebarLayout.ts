import { computed, onMounted, ref, watch } from 'vue'

const STORAGE_KEY = 'app-shell:sidebar'
const DEFAULT_WIDTH = 300
const MIN_WIDTH = 240
const MAX_WIDTH = 360
const COLLAPSED_WIDTH = 56
const HIDDEN_WIDTH = 0

const state = {
  initialized: ref(false),
  isCollapsed: ref(false),
  isHidden: ref(false),
  width: ref(DEFAULT_WIDTH),
  lastExpandedWidth: ref(DEFAULT_WIDTH),
}

const clampWidth = (value: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value))

export const useSidebarLayout = () => {
  const isCollapsed = state.isCollapsed
  const isHidden = state.isHidden
  const width = state.width
  const lastExpandedWidth = state.lastExpandedWidth

  const effectiveWidth = computed(() => {
    if (isHidden.value) return HIDDEN_WIDTH
    return isCollapsed.value ? COLLAPSED_WIDTH : clampWidth(width.value)
  })

  const setCollapsed = (value: boolean) => {
    if (value === isCollapsed.value) return
    if (value) {
      lastExpandedWidth.value = clampWidth(width.value || lastExpandedWidth.value || DEFAULT_WIDTH)
      isCollapsed.value = true
      width.value = COLLAPSED_WIDTH
      return
    }
    isCollapsed.value = false
    width.value = clampWidth(lastExpandedWidth.value || DEFAULT_WIDTH)
  }

  const toggleCollapsed = () => {
    setCollapsed(!isCollapsed.value)
  }

  const expand = () => setCollapsed(false)
  const collapse = () => setCollapsed(true)

  // Hide/show sidebar completely (width = 0)
  const hide = () => {
    isHidden.value = true
  }

  const show = () => {
    isHidden.value = false
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
    isHidden,
    width: effectiveWidth,
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
    collapsedWidth: COLLAPSED_WIDTH,
    hiddenWidth: HIDDEN_WIDTH,
    toggleCollapsed,
    setCollapsed,
    expand,
    collapse,
    hide,
    show,
    setWidth,
  }
}
