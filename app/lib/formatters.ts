/**
 * Formatters centralizzati per l'applicazione
 * Sostituisce i formatter duplicati in vari file
 */

import type { ApiEstimate } from "@/types/api";

// ============= CURRENCY =============

export interface CurrencyFormatOptions {
    locale?: string;
    currency?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    fallback?: string;
}

export interface NumberFormatOptions {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    fallback?: string;
}

export const formatCurrency = (
    value: number | null | undefined,
    options: CurrencyFormatOptions = {}
): string => {
    const {
        locale = "it-IT",
        currency = "EUR",
        minimumFractionDigits = 2,
        maximumFractionDigits = 2,
        fallback = "?'?0",
    } = options;

    if (value === null || value === undefined || isNaN(value)) return fallback;
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(value);
};

export const formatCurrencyCompact = (
    value: number | null | undefined,
    options: CurrencyFormatOptions = {}
): string => {
    return formatCurrency(value, {
        ...options,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
};

export const formatNumber = (
    value: number | null | undefined,
    options: NumberFormatOptions = {}
): string => {
    const {
        locale = "it-IT",
        minimumFractionDigits = 2,
        maximumFractionDigits = 2,
        fallback = "-",
    } = options;

    if (value === null || value === undefined || isNaN(value)) return fallback;
    return new Intl.NumberFormat(locale, {
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(value);
};

// ============= PERCENTAGES =============

export const formatPercentage = (value: number | null | undefined, decimals: number = 1): string => {
    if (value === null || value === undefined || isNaN(value)) return "0%";
    return `${value.toFixed(decimals)}%`;
};

// ============= DATES =============

export const formatShortDate = (value?: string | Date | null): string => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

export const formatFullDateTime = (value?: string | Date | null): string => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleString("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export const formatRelativeTime = (value?: string | Date | null): string => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "adesso";
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    if (diffDays < 7) return `${diffDays} giorni fa`;
    return formatShortDate(date);
};

// ============= TEXT =============

export const truncateText = (
    text: string | null | undefined,
    maxLength: number = 80
): string => {
    if (!text) return "-";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
};

export const truncateMiddle = (
    text: string | null | undefined,
    startChars: number = 50,
    endChars: number = 50
): string => {
    if (!text) return "-";
    const totalChars = startChars + endChars;
    if (text.length <= totalChars) return text;
    const start = text.slice(0, startChars);
    const end = text.slice(-endChars);
    return `${start}...${end}`;
};

// ============= ESTIMATES HELPERS =============

export const groupEstimates = (estimates: ApiEstimate[]) => {
    const project = estimates.filter((c) => c.type === "project");
    const offers = estimates.filter((c) => c.type === "offer");
    return { project, offers };
};

export const getRoundLabel = (roundNumber: number | null | undefined): string => {
    if (roundNumber === null || roundNumber === undefined) return "-";
    return `Round ${roundNumber}`;
};

// ============= DELTA FORMATTING =============

export const formatDelta = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return "0%";
    const sign = value > 0 ? "+" : "";
    return `${sign}${formatPercentage(value, 1)}`;
};

export const formatDeltaCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return "€0";
    const sign = value > 0 ? "+" : "";
    return `${sign}${formatCurrency(value)}`;
};
