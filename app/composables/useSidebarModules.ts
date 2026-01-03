/**
 * useSidebarModules.ts
 * 
 * Centralized state management for the modular sidebar system.
 * Implements route-scoped registration to prevent "ghost" modules
 * when navigating between pages.
 */

import { ref, computed, shallowRef, watch, onUnmounted, type Component, type ShallowRef, getCurrentInstance } from 'vue'
import { useSidebarLayout } from '~/composables/useSidebarLayout'

// Module definition
export interface SidebarModule {
    /** Unique module ID */
    id: string
    /** Display label for navigation */
    label: string
    /** Icon name (heroicons format) */
    icon: string
    /** Vue component to render */
    component: Component
    /** Optional badge (count or text) */
    badge?: number | string
    /** Sort order (lower = first) */
    order?: number
    /** Group: primary modules show first */
    group?: 'primary' | 'secondary'
    /** Props to pass to the component */
    props?: Record<string, unknown>
}

// Internal module with ownership tracking
interface SidebarModuleInternal extends SidebarModule {
    _routePath?: string
    _isLayout?: boolean
}

// Global state (shared across all instances)
const modules: ShallowRef<SidebarModuleInternal[]> = shallowRef([])
const activeModuleId = ref<string | null>(null)
const currentRoutePath = ref<string>('')

// Keep track if route watcher is set up
let routeWatcherInitialized = false

export function useSidebarModules() {
    const { isCollapsed, toggleCollapsed, expand, collapse } = useSidebarLayout()
    const route = useRoute()

    // Initialize route watcher once (clears page modules on navigation)
    if (!routeWatcherInitialized && import.meta.client) {
        routeWatcherInitialized = true

        watch(
            () => route.path,
            (newPath, oldPath) => {
                if (oldPath && newPath !== oldPath) {
                    // Clear all non-layout modules when route changes
                    const layoutModules = modules.value.filter(m => m._isLayout)
                    modules.value = layoutModules

                    // Reset active module to first available
                    if (layoutModules.length > 0 && layoutModules[0]) {
                        activeModuleId.value = layoutModules[0].id
                    } else {
                        activeModuleId.value = null
                    }
                }
                currentRoutePath.value = newPath
            },
            { immediate: true }
        )
    }

    const sortModules = (list: SidebarModuleInternal[]) => {
        list.sort((a, b) => {
            const groupA = a.group === 'secondary' ? 1 : 0
            const groupB = b.group === 'secondary' ? 1 : 0
            if (groupA !== groupB) return groupA - groupB
            return (a.order ?? 100) - (b.order ?? 100)
        })
    }

    /**
     * Register a module from the layout (persists across routes)
     */
    const registerLayoutModule = (module: SidebarModule) => {
        const internalModule: SidebarModuleInternal = {
            ...module,
            _isLayout: true,
        }

        const existingIndex = modules.value.findIndex(m => m.id === module.id)
        if (existingIndex >= 0) {
            const nextModules = [...modules.value]
            nextModules[existingIndex] = { ...nextModules[existingIndex], ...internalModule }
            sortModules(nextModules)
            modules.value = nextModules
            return
        }

        const newModules = [...modules.value, internalModule]
        sortModules(newModules)
        modules.value = newModules

        if (!activeModuleId.value && newModules.length > 0 && newModules[0]) {
            activeModuleId.value = newModules[0].id
        }

        expand()
    }

    /**
     * Register a page-level module (auto-removed on route change)
     */
    const registerPageModule = (module: SidebarModule) => {
        const internalModule: SidebarModuleInternal = {
            ...module,
            _routePath: route.path,
            _isLayout: false,
        }

        const existingIndex = modules.value.findIndex(m => m.id === module.id)
        if (existingIndex >= 0) {
            const nextModules = [...modules.value]
            nextModules[existingIndex] = { ...nextModules[existingIndex], ...internalModule }
            sortModules(nextModules)
            modules.value = nextModules
            return
        }

        const newModules = [...modules.value, internalModule]
        sortModules(newModules)
        modules.value = newModules

        if (!activeModuleId.value && newModules.length > 0 && newModules[0]) {
            activeModuleId.value = newModules[0].id
        }

        expand()
    }

    /**
     * Register a new module in the sidebar (legacy - defaults to page module)
     */
    const registerModule = (module: SidebarModule) => {
        registerPageModule(module)
    }

    /**
     * Unregister a module by ID
     */
    const unregisterModule = (moduleId: string) => {
        modules.value = modules.value.filter(m => m.id !== moduleId)

        // If we removed the active module, switch to first available
        if (activeModuleId.value === moduleId) {
            activeModuleId.value = modules.value[0]?.id ?? null
        }
    }

    /**
     * Set the active module by ID
     */
    const setActiveModule = (moduleId: string) => {
        if (modules.value.some(m => m.id === moduleId)) {
            activeModuleId.value = moduleId
        }
    }

    /**
     * Clear all non-layout modules
     */
    const clearPageModules = () => {
        const layoutModules = modules.value.filter(m => m._isLayout)
        modules.value = layoutModules
        if (layoutModules.length > 0 && layoutModules[0]) {
            activeModuleId.value = layoutModules[0].id
        } else {
            activeModuleId.value = null
        }
    }

    /**
     * Clear all modules (useful for complete reset)
     */
    const clearAllModules = () => {
        modules.value = []
        activeModuleId.value = null
    }

    /**
     * Toggle sidebar visibility
     */
    const toggleVisibility = () => {
        toggleCollapsed()
    }

    /**
     * Show the sidebar
     */
    const showSidebar = () => {
        expand()
    }

    /**
     * Hide the sidebar
     */
    const hideSidebar = () => {
        collapse()
    }

    // Computed getters
    const activeModule = computed(() =>
        modules.value.find(m => m.id === activeModuleId.value) ?? null
    )

    const isVisible = computed(() => !isCollapsed.value)

    const hasModules = computed(() => modules.value.length > 0)

    const primaryModules = computed(() =>
        modules.value.filter(m => m.group !== 'secondary')
    )

    const secondaryModules = computed(() =>
        modules.value.filter(m => m.group === 'secondary')
    )

    return {
        // State
        modules: computed(() => modules.value as SidebarModule[]),
        activeModuleId,
        activeModule,
        isVisible,
        hasModules,
        primaryModules,
        secondaryModules,

        // Actions
        registerModule,
        registerLayoutModule,
        registerPageModule,
        unregisterModule,
        setActiveModule,
        clearPageModules,
        clearAllModules,
        toggleVisibility,
        showSidebar,
        hideSidebar,
    }
}

/**
 * Helper composable for page-level sidebar modules.
 * Automatically registers module on setup and handles cleanup.
 * 
 * Usage:
 * ```ts
 * usePageSidebarModule({
 *   id: 'wbs',
 *   label: 'WBS',
 *   icon: 'heroicons:squares-2x2',
 *   component: WbsModule,
 *   props: { nodes: wbsNodes }
 * })
 * ```
 */
export function usePageSidebarModule(module: SidebarModule) {
    const { registerPageModule, unregisterModule, setActiveModule, showSidebar } = useSidebarModules()

    // Register immediately
    registerPageModule(module)
    setActiveModule(module.id)

    // Also register on mounted (in case of HMR)
    onMounted(() => {
        registerPageModule(module)
        setActiveModule(module.id)
    })

    // Cleanup on unmount (backup, route watcher is primary)
    onUnmounted(() => {
        unregisterModule(module.id)
    })

    return {
        show: () => {
            setActiveModule(module.id)
            showSidebar()
        },
        update: (updates: Partial<SidebarModule>) => {
            registerPageModule({ ...module, ...updates })
        }
    }
}
