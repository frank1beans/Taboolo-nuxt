import type {
  ApiOfferAlert,
  ApiOfferAlertSummaryResponse,
  ApiOfferAddendumItem,
} from "@/types/api";
import { apiFetch, buildQueryString } from "./client";

export interface ApiPriceListItemCandidate {
  id: string;
  code?: string | null;
  description?: string | null;
  long_description?: string | null;
  unit?: string | null;
  price?: number | null;
}

export const offersApi = {
  async getAlerts(
    projectId: number | string,
    params?: {
      offer_id?: string;
      estimate_id?: string;
      type?: string;
      severity?: string;
      status?: string;
    },
  ): Promise<{ alerts: ApiOfferAlert[] }> {
    const suffix = buildQueryString(params || {});
    return apiFetch<{ alerts: ApiOfferAlert[] }>(
      `/projects/${projectId}/offers/alerts${suffix}`,
    );
  },

  async getAlertSummary(
    projectId: number | string,
    params?: {
      group_by?: "offer" | "estimate";
      offer_id?: string;
      estimate_id?: string;
      type?: string;
      status?: string;
    },
  ): Promise<ApiOfferAlertSummaryResponse> {
    const suffix = buildQueryString(params || {});
    return apiFetch<ApiOfferAlertSummaryResponse>(
      `/projects/${projectId}/offers/alerts/summary${suffix}`,
    );
  },

  async resolveAlert(
    projectId: number | string,
    alertId: string,
    payload: {
      status: "open" | "resolved" | "ignored";
      resolution_note?: string;
      resolved_by?: string;
      selected_price_list_item_id?: string;
      apply_approved_price?: boolean;
    },
  ): Promise<{ success: boolean; alert: ApiOfferAlert }> {
    return apiFetch<{ success: boolean; alert: ApiOfferAlert }>(
      `/projects/${projectId}/offers/alerts/${alertId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },

  async getAlertCandidates(
    projectId: number | string,
    alertId: string,
  ): Promise<{ alert: ApiOfferAlert; candidates: ApiPriceListItemCandidate[] }> {
    return apiFetch<{ alert: ApiOfferAlert; candidates: ApiPriceListItemCandidate[] }>(
      `/projects/${projectId}/offers/alerts/${alertId}/candidates`,
    );
  },

  async getAddendum(
    projectId: number | string,
    params: {
      estimate_id: string;
      round?: number;
      company?: string;
    },
  ): Promise<{ items: ApiOfferAddendumItem[] }> {
    const suffix = buildQueryString(params);
    return apiFetch<{ items: ApiOfferAddendumItem[] }>(
      `/projects/${projectId}/offers/addendum${suffix}`,
    );
  },
};
