import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

/**
 * useHelp - Composable for contextual help system
 * 
 * Provides:
 * - Modal open/close state
 * - Route-to-documentation mapping
 * - Markdown content loading
 * - Keyboard shortcut (F1)
 */

// Map routes to documentation files
const routeToDocMap: Record<string, string> = {
    // Dashboard
    '/': '02-primi-passi',

    // Projects
    '/projects': '03-gestione-progetti',

    // Import
    '/import': '04-import-computo',

    // Analytics
    '/analytics': '08-analytics-mappe',

    // Catalogs
    '/catalogs': '07-listino-catalogo',

    // Price Estimator
    '/price-estimator': '10-stima-prezzi',
}

// Pattern-based mapping for dynamic routes
const routePatterns: Array<{ pattern: RegExp; doc: string; title: string }> = [
    { pattern: /^\/projects\/[^/]+\/import/, doc: '04-import-computo', title: 'Import Computo' },
    { pattern: /^\/projects\/[^/]+\/estimate\/[^/]+\/offer/, doc: '05-import-offerte', title: 'Dettaglio Offerta' },
    { pattern: /^\/projects\/[^/]+\/estimate\/[^/]+\/comparison/, doc: '06-confronto-offerte', title: 'Confronto Offerte' },
    { pattern: /^\/projects\/[^/]+\/estimate\/[^/]+/, doc: '06-confronto-offerte', title: 'Confronto Offerte' },
    { pattern: /^\/projects\/[^/]+\/pricelist/, doc: '07-listino-catalogo', title: 'Listino' },
    { pattern: /^\/projects\/[^/]+\/conflicts/, doc: '09-conflitti-alert', title: 'Conflitti e Alert' },
    { pattern: /^\/projects\/[^/]+\/analytics/, doc: '08-analytics-mappe', title: 'Analytics' },
    { pattern: /^\/projects\/[^/]+$/, doc: '03-gestione-progetti', title: 'Dashboard Progetto' },
]

// Title mapping
const docTitles: Record<string, string> = {
    '01-introduzione': 'Introduzione a Taboolo',
    '02-primi-passi': 'Primi Passi',
    '03-gestione-progetti': 'Gestione Progetti',
    '04-import-computo': 'Import Computo',
    '05-import-offerte': 'Import Offerte',
    '06-confronto-offerte': 'Confronto Offerte',
    '07-listino-catalogo': 'Listino e Catalogo',
    '08-analytics-mappe': 'Analytics e Mappe',
    '09-conflitti-alert': 'Conflitti e Alert',
    '10-stima-prezzi': 'Stima Prezzi',
    'FAQ': 'Domande Frequenti',
}

export const useHelp = () => {
    const route = useRoute()
    const isOpen = ref(false)
    const content = ref('')
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    // Determine which doc file to show based on current route
    const currentDoc = computed(() => {
        const path = route.path

        // Check exact matches first
        if (routeToDocMap[path]) {
            return routeToDocMap[path]
        }

        // Check pattern matches
        for (const { pattern, doc } of routePatterns) {
            if (pattern.test(path)) {
                return doc
            }
        }

        // Default to introduction
        return '01-introduzione'
    })

    const currentTitle = computed(() => {
        return docTitles[currentDoc.value] || 'Aiuto'
    })

    // Load markdown content from API
    const loadContent = async () => {
        isLoading.value = true
        error.value = null

        try {
            const response = await $fetch<{ content: string; title: string }>(`/api/help/${currentDoc.value}`)
            content.value = response.content
        } catch (e) {
            console.error('Failed to load help content:', e)
            error.value = 'Impossibile caricare la documentazione.'
            content.value = ''
        } finally {
            isLoading.value = false
        }
    }

    // Open/close modal
    const open = () => {
        isOpen.value = true
        loadContent()
    }

    const close = () => {
        isOpen.value = false
    }

    const toggle = () => {
        if (isOpen.value) {
            close()
        } else {
            open()
        }
    }

    // Keyboard shortcut handler
    const handleKeydown = (e: KeyboardEvent) => {
        // F1 to open help
        if (e.key === 'F1') {
            e.preventDefault()
            toggle()
            return
        }

        // Escape to close
        if (e.key === 'Escape' && isOpen.value) {
            close()
        }
    }

    // Watch for route changes to reload content if modal is open
    watch(() => route.path, () => {
        if (isOpen.value) {
            loadContent()
        }
    })

    // Setup keyboard listener
    onMounted(() => {
        window.addEventListener('keydown', handleKeydown)
    })

    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeydown)
    })

    return {
        isOpen,
        content,
        isLoading,
        error,
        currentDoc,
        currentTitle,
        open,
        close,
        toggle,
    }
}
