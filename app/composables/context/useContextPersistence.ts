const STORAGE_KEY = 'taboolo:current-context'

export const persistClient = (currentProjectId: string | null, currentEstimateId: string | null) => {
    if (!process.client) return
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                currentProjectId,
                currentEstimateId,
            }),
        )
    } catch {
        // ignore storage errors
    }
}

export const restoreFromClient = (): { currentProjectId: string | null; currentEstimateId: string | null } | null => {
    if (!process.client) return null
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as {
            currentProjectId?: string | null
            currentEstimateId?: string | null
        }
        return {
            currentProjectId: parsed.currentProjectId ?? null,
            currentEstimateId: parsed.currentEstimateId ?? null,
        }
    } catch {
        return null
    }
}
