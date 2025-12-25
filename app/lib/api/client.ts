/**
 * Core API Client utilities
 * Base fetch logic, authentication headers, error handling
 */

import { useRuntimeConfig } from "#app";
import { toast } from "vue-sonner";
import { getAccessToken } from "../auth-storage";

export const API_BASE_URL =
    process.env.NUXT_PUBLIC_API_BASE_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "/api";

export const apiBaseNoTrailing = API_BASE_URL.replace(/\/+$/, "");
export const apiBaseWithoutPrefix = apiBaseNoTrailing.replace(/\/api\/v1$/, "");

/**
 * Get runtime API base URL
 */
export const getApiBaseUrl = () => {
    const config = useRuntimeConfig();
    const fromRuntime = config?.public?.apiBaseUrl;
    const base = (fromRuntime as string | undefined) || API_BASE_URL;
    return base.replace(/\/+$/, "");
};

/**
 * Generate auth headers with bearer token if available
 */
export const authHeaders = () => {
    const token = getAccessToken();
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

/**
 * Parse error response and extract meaningful message
 */
async function parseErrorResponse(response: Response): Promise<string> {
    let message = `Request failed with status ${response.status}`;
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
        try {
            const payload: unknown = await response.json();
            if (typeof payload === "string") {
                message = payload;
            } else if (payload && typeof payload === "object") {
                const data = payload as Record<string, unknown>;
                if (Array.isArray(data.detail)) {
                    message = data.detail
                        .map((item) => {
                            if (typeof item === "string") return item;
                            if (item && typeof item === "object" && "msg" in item) {
                                return String((item as Record<string, unknown>).msg);
                            }
                            return JSON.stringify(item);
                        })
                        .join("\n");
                } else if (data.detail) {
                    if (
                        typeof data.detail === "object" &&
                        data.detail !== null &&
                        "message" in data.detail
                    ) {
                        message = String(
                            (data.detail as Record<string, unknown>).message ?? "Invalid request",
                        );
                    } else {
                        message = String(data.detail);
                    }
                } else if (data.message) {
                    message = String(data.message);
                }
            }
        } catch {
            const fallback = await response.text();
            if (fallback) message = fallback;
        }
    } else {
        const text = await response.text();
        if (text) message = text;
    }

    return message;
}

/**
 * Handle 401 unauthorized response
 */
function handleUnauthorized(): never {
    toast.error("Session expired. Please sign in again.");
    if (typeof window !== "undefined") {
        setTimeout(() => {
            window.location.href = "/login";
        }, 100);
    }
    throw new Error("Unauthorized");
}

/**
 * Core API fetch function with automatic auth, error handling and toast notifications
 */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const token = getAccessToken();
    const base = getApiBaseUrl();
    const response = await fetch(`${base}${path}`, {
        cache: options?.cache ?? "no-store",
        headers: {
            ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options?.headers,
        },
        ...options,
    });

    if (!response.ok) {
        if (response.status === 401) {
            handleUnauthorized();
        }

        const message = await parseErrorResponse(response);

        if (response.status >= 400) {
            toast.error(message || "An error occurred while processing the request");
        }

        throw new Error(message);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    const expectsJson = response.headers.get("content-type")?.includes("application/json");
    if (!expectsJson) {
        return undefined as T;
    }

    return (await response.json()) as T;
}

/**
 * Helper to build query strings from params object
 */
export function buildQueryString(params: Record<string, string | number | boolean | null | undefined>): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
            query.set(key, String(value));
        }
    }
    const str = query.toString();
    return str ? `?${str}` : "";
}
