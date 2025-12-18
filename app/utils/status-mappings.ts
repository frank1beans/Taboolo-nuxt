export type UnifiedStatus = 'setup' | 'in_progress' | 'completed' | 'archived' | 'warning' | 'unknown';

export interface StatusConfig {
    label: string;
    color: string; // Tailwind classes for raw HTML usage
    badgeColor: string; // UBadge color prop values
    icon?: string;
}

export const UNIFIED_STATUSES: Record<UnifiedStatus, StatusConfig> = {
    setup: {
        label: 'Setup',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        badgeColor: 'gray',
        icon: 'i-heroicons-wrench-screwdriver',
    },
    in_progress: {
        label: 'In Corso',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        badgeColor: 'yellow',
        icon: 'i-heroicons-play',
    },
    completed: {
        label: 'Completo',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        badgeColor: 'green',
        icon: 'i-heroicons-check-circle',
    },
    archived: {
        label: 'Archiviato',
        color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400',
        badgeColor: 'slate',
        icon: 'i-heroicons-archive-box',
    },
    warning: {
        label: 'Attenzione',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        badgeColor: 'red',
        icon: 'i-heroicons-exclamation-triangle',
    },
    unknown: {
        label: '-',
        color: 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
        badgeColor: 'gray',
    }
};

/**
 * Maps distinct entity statuses to a unified status.
 */
export const mapEntityStatus = (status: string | null | undefined): UnifiedStatus => {
    if (!status) return 'setup';

    const s = status.toLowerCase();

    // Estimate / Project Statuses
    if (s === 'draft' || s === 'bozza' || s === 'setup' || s === 'baseline') return 'setup';
    if (s === 'submitted' || s === 'inviata' || s === 'sent' || s === 'running' || s === 'in_progress' || s === 'in corso') return 'in_progress';
    if (s === 'accepted' || s === 'accettata' || s === 'won' || s === 'completed' || s === 'awarded' || s === 'closed' || s === 'chiuso') return 'completed';
    if (s === 'rejected' || s === 'rifiutata' || s === 'lost') return 'archived'; // or warning
    if (s === 'archived') return 'archived';

    return 'unknown';
};

export const getStatusConfig = (status: string | null | undefined): StatusConfig => {
    const unified = mapEntityStatus(status);
    return UNIFIED_STATUSES[unified] || UNIFIED_STATUSES.unknown;
};
