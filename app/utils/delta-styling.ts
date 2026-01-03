/**
 * Centralized delta styling utilities
 * Used for price deltas across comparison tables, conflicts, and analytics
 * 
 * Convention:
 * - Positive delta (higher price) = red (bad/destructive)
 * - Negative delta (lower price) = green (good/success)
 */

export interface DeltaStyleOptions {
    /** Invert the color logic (positive = good, negative = bad) */
    invertColors?: boolean;
    /** Add font-semibold to the class */
    addFontWeight?: boolean;
}

/**
 * Get the text color class for a delta value
 * @param value - The delta value (positive, negative, or zero/null)
 * @param options - Styling options
 * @returns Tailwind CSS class string
 */
export const getDeltaTextClass = (
    value: number | null | undefined,
    options?: DeltaStyleOptions
): string => {
    if (value == null || value === 0) {
        return 'text-[hsl(var(--muted-foreground))]';
    }

    const isGood = options?.invertColors ? value > 0 : value < 0;
    const baseClass = isGood
        ? 'text-[hsl(var(--success))]'
        : 'text-[hsl(var(--destructive))]';

    return options?.addFontWeight ? `${baseClass} font-semibold` : baseClass;
};

/**
 * Get delta color for AG Grid cell renderer
 * Returns empty string for zero/null values (no color change)
 */
export const getDeltaCellClass = (
    value: number | null | undefined,
    options?: DeltaStyleOptions
): string => {
    if (value == null || value === 0) return '';
    return getDeltaTextClass(value, options);
};

/**
 * Format delta percentage for display with sign
 */
export const formatDeltaPercent = (value: number | null | undefined): string => {
    if (value == null) return '-';
    if (value === 0) return '0%';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
};

/**
 * Format delta with sign prefix
 */
export const formatDeltaWithSign = (value: number): string => {
    if (value === 0) return '0%';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(0)}%`;
};
