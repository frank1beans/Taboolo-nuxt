/**
 * Centralized Status Configuration
 * 
 * Single source of truth for all status → color/label/icon mappings.
 * Used by StatusBadge and other consumers throughout the app.
 */

export type BadgeColor = 'warning' | 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'neutral' | undefined;

export interface StatusConfig {
    label: string;
    color: string; // Tailwind classes for raw HTML usage
    badgeColor: BadgeColor; // UBadge color prop values
    icon?: string;
}

// =============================================================================
// UNIFIED ENTITY STATUSES
// =============================================================================

export type UnifiedStatus = 'setup' | 'in_progress' | 'completed' | 'archived' | 'warning' | 'unknown';

export const UNIFIED_STATUSES: Record<UnifiedStatus, StatusConfig> = {
    setup: {
        label: 'Setup',
        color: 'bg-muted text-muted-foreground',
        badgeColor: 'neutral',
        icon: 'i-heroicons-wrench-screwdriver',
    },
    in_progress: {
        label: 'In Corso',
        color: 'bg-warning-light text-warning',
        badgeColor: 'success',
        icon: 'i-heroicons-play',
    },
    completed: {
        label: 'Completo',
        color: 'bg-success-light text-success',
        badgeColor: 'primary',
        icon: 'i-heroicons-check-circle',
    },
    archived: {
        label: 'Archiviato',
        color: 'bg-muted text-muted-foreground',
        badgeColor: 'neutral',
        icon: 'i-heroicons-archive-box',
    },
    warning: {
        label: 'Attenzione',
        color: 'bg-destructive-light text-destructive',
        badgeColor: 'warning',
        icon: 'i-heroicons-exclamation-triangle',
    },
    unknown: {
        label: '-',
        color: 'bg-muted text-muted-foreground',
        badgeColor: 'neutral',
    },
};

// =============================================================================
// CONFLICT STATUSES
// =============================================================================

export type ConflictStatus = 'pending' | 'resolved' | 'ignored' | 'auto_resolved';

export const CONFLICT_STATUSES: Record<ConflictStatus, StatusConfig> = {
    pending: {
        label: 'In Attesa',
        color: 'bg-warning-light text-warning',
        badgeColor: 'warning',
        icon: 'i-heroicons-clock',
    },
    resolved: {
        label: 'Risolto',
        color: 'bg-success-light text-success',
        badgeColor: 'success',
        icon: 'i-heroicons-check-circle',
    },
    ignored: {
        label: 'Ignorato',
        color: 'bg-muted text-muted-foreground',
        badgeColor: 'neutral',
        icon: 'i-heroicons-eye-slash',
    },
    auto_resolved: {
        label: 'Auto-risolto',
        color: 'bg-info-light text-info',
        badgeColor: 'info',
        icon: 'i-heroicons-sparkles',
    },
};

// =============================================================================
// OFFER/ESTIMATE STATUSES
// =============================================================================

export type OfferStatus = 'draft' | 'submitted' | 'accepted' | 'rejected' | 'expired';

export const OFFER_STATUSES: Record<OfferStatus, StatusConfig> = {
    draft: {
        label: 'Bozza',
        color: 'bg-muted text-muted-foreground',
        badgeColor: 'neutral',
        icon: 'i-heroicons-pencil-square',
    },
    submitted: {
        label: 'Inviata',
        color: 'bg-info-light text-info',
        badgeColor: 'info',
        icon: 'i-heroicons-paper-airplane',
    },
    accepted: {
        label: 'Accettata',
        color: 'bg-success-light text-success',
        badgeColor: 'success',
        icon: 'i-heroicons-check-circle',
    },
    rejected: {
        label: 'Rifiutata',
        color: 'bg-destructive-light text-destructive',
        badgeColor: 'error',
        icon: 'i-heroicons-x-circle',
    },
    expired: {
        label: 'Scaduta',
        color: 'bg-muted text-muted-foreground',
        badgeColor: 'neutral',
        icon: 'i-heroicons-clock',
    },
};

// =============================================================================
// IMPORT STATUSES
// =============================================================================

export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export const IMPORT_STATUSES: Record<ImportStatus, StatusConfig> = {
    pending: {
        label: 'In Attesa',
        color: 'bg-muted text-muted-foreground',
        badgeColor: 'neutral',
        icon: 'i-heroicons-clock',
    },
    processing: {
        label: 'In Elaborazione',
        color: 'bg-info-light text-info',
        badgeColor: 'info',
        icon: 'i-heroicons-arrow-path',
    },
    completed: {
        label: 'Completato',
        color: 'bg-success-light text-success',
        badgeColor: 'success',
        icon: 'i-heroicons-check-circle',
    },
    failed: {
        label: 'Fallito',
        color: 'bg-destructive-light text-destructive',
        badgeColor: 'error',
        icon: 'i-heroicons-x-circle',
    },
};

// =============================================================================
// ENTITY TYPE ENUM
// =============================================================================

export type EntityType = 'project' | 'conflict' | 'offer' | 'import';

// =============================================================================
// STATUS MAPPING FUNCTIONS
// =============================================================================

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
    if (s === 'rejected' || s === 'rifiutata' || s === 'lost') return 'archived';
    if (s === 'archived') return 'archived';

    return 'unknown';
};

/**
 * Get status configuration for a given entity type and status value.
 */
export const getStatusConfig = (
    status: string | null | undefined,
    entityType: EntityType = 'project'
): StatusConfig => {
    if (!status) {
        return UNIFIED_STATUSES.unknown;
    }

    const s = status.toLowerCase();

    switch (entityType) {
        case 'conflict':
            return CONFLICT_STATUSES[s as ConflictStatus] || UNIFIED_STATUSES.unknown;

        case 'offer':
            return OFFER_STATUSES[s as OfferStatus] || UNIFIED_STATUSES.unknown;

        case 'import':
            return IMPORT_STATUSES[s as ImportStatus] || UNIFIED_STATUSES.unknown;

        case 'project':
        default:
            const unified = mapEntityStatus(status);
            return UNIFIED_STATUSES[unified] || UNIFIED_STATUSES.unknown;
    }
};

/**
 * Get unified status for a raw status string (backward compatibility).
 */
export const getUnifiedStatusConfig = (status: string | null | undefined): StatusConfig => {
    const unified = mapEntityStatus(status);
    return UNIFIED_STATUSES[unified] || UNIFIED_STATUSES.unknown;
};

// Re-export for backward compatibility
export { UNIFIED_STATUSES as STATUS_CONFIGS };
