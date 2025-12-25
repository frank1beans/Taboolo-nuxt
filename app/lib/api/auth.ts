/**
 * Auth API endpoints
 * Login, register, profile, user management
 */

import type {
    ApiAuthResponse,
    ApiUser,
    ApiUserProfile,
} from "@/types/api";
import { apiFetch } from "./client";

export const authApi = {
    async login(payload: { email: string; password: string }): Promise<ApiAuthResponse> {
        return apiFetch<ApiAuthResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    async register(payload: {
        email: string;
        password: string;
        full_name?: string | null;
    }): Promise<ApiUser> {
        return apiFetch<ApiUser>("/auth/register", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    async logout(): Promise<void> {
        await apiFetch("/auth/logout", { method: "POST" });
    },

    async getCurrentUser(): Promise<ApiUser> {
        return apiFetch<ApiUser>("/me");
    },

    async getProfile(): Promise<ApiUserProfile> {
        return apiFetch<ApiUserProfile>("/profile");
    },

    async updateProfile(payload: Partial<ApiUserProfile>): Promise<ApiUserProfile> {
        return apiFetch<ApiUserProfile>("/profile", {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    },
};
