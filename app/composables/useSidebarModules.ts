/**
 * useSidebarModules.ts
 * 
 * Centralized state management for the modular sidebar system.
 * Allows pages to dynamically register/unregister sidebar modules (drawers).
 */

import { ref, computed, shallowRef, type Component, type ShallowRef } from 'vue'
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

// Global state (shared across all instances)
const modules: ShallowRef<SidebarModule[]> = shallowRef([])
const activeModuleId = ref<string | null>(null)

export function useSidebarModules() {
    const { isCollapsed, toggleCollapsed, expand, collapse } = useSidebarLayout()

    const sortModules = (list: SidebarModule[]) => {
        list.sort((a, b) => {
            const groupA = a.group === 'secondary' ? 1 : 0
            const groupB = b.group === 'secondary' ? 1 : 0
            if (groupA !== groupB) return groupA - groupB
            return (a.order ?? 100) - (b.order ?? 100)
        })
    }

    /**
     * Register a new module in the sidebar
     */
    const registerModule = (module: SidebarModule) => {
        const existingIndex = modules.value.findIndex(m => m.id === module.id)
        if (existingIndex >= 0) {
            const nextModules = [...modules.value]
            nextModules[existingIndex] = { ...nextModules[existingIndex], ...module }
            sortModules(nextModules)
            modules.value = nextModules
            return
        }

        // Add module and sort by order
        const newModules = [...modules.value, module]
        sortModules(newModules)
        modules.value = newModules

        // Auto-activate first module if none active
        if (!activeModuleId.value && newModules.length > 0) {
            activeModuleId.value = newModules[0].id
        }

        // Show sidebar when modules are registered
        expand()
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
     * Clear all modules (useful on page unmount)
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
        modules,
        activeModuleId,
        activeModule,
        isVisible,
        hasModules,
        primaryModules,
        secondaryModules,

        // Actions
        registerModule,
        unregisterModule,
        setActiveModule,
        clearAllModules,
        toggleVisibility,
        showSidebar,
        hideSidebar,
    }
}
