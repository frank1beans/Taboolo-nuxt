/**
 * Dashboard API endpoints
 * Stats and overview data
 */

import type { ApiDashboardStats } from "@/types/api";
import { apiFetch } from "./client";

export const dashboardApi = {
    async getStats(): Promise<ApiDashboardStats> {
        return apiFetch<ApiDashboardStats>("/dashboard/stats");
    },
};
