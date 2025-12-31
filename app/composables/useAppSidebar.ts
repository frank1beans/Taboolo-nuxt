/**
 * useAppSidebar.ts
 * 
 * Manages the state of the Context Sidebar (Left).
 * Uses Route Meta to determine if the default sidebar should be shown.
 */

export function useAppSidebar() {
    const route = useRoute()

    const showDefaultSidebar = computed(() => {
        // If disableDefaultSidebar is true, we hide the default sidebar (return false)
        return !route.meta.disableDefaultSidebar
    })

    return {
        showDefaultSidebar
    }
}
