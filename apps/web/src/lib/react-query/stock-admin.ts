import type {
  ActiveReservationListQuery,
  ActiveReservationListResponse,
  AdminReservationListQuery,
  AdminReservationListResponse,
  AdminStockBalanceSummary,
  AdminStockBalanceListQuery,
  AdminStockBalanceListResponse,
  AdminStockCountRequest,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const activeReservationsQueryKey = (
  query: Partial<ActiveReservationListQuery>,
) => ["stock", "reservations", "active", query] as const;

export async function fetchActiveReservations(
  query: ActiveReservationListQuery,
): Promise<ActiveReservationListResponse> {
  const searchParams = new URLSearchParams({
    limit: String(query.limit),
    locationId: query.locationId,
  });

  if (query.expiresAfter) {
    searchParams.set("expiresAfter", query.expiresAfter);
  }

  if (query.expiresBefore) {
    searchParams.set("expiresBefore", query.expiresBefore);
  }

  if (query.skuId) {
    searchParams.set("skuId", query.skuId);
  }

  if (query.sourceType) {
    searchParams.set("sourceType", query.sourceType);
  }

  return fetchJson<ActiveReservationListResponse>(
    `/api/admin/stock/reservations/active?${searchParams.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export const stockBalancesQueryKey = (
  query: Partial<AdminStockBalanceListQuery>,
) => ["stock", "balances", query] as const;

export async function fetchStockBalances(
  query: AdminStockBalanceListQuery,
): Promise<AdminStockBalanceListResponse> {
  const params = new URLSearchParams({
    locationSlug: query.locationSlug,
    page: String(query.page),
    pageSize: String(query.pageSize),
  });

  if (query.q) {
    params.set("q", query.q);
  }

  return fetchJson<AdminStockBalanceListResponse>(
    `/api/admin/stock/balances?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export const adminReservationsQueryKey = (
  query: Partial<AdminReservationListQuery>,
) => ["stock", "reservations", "admin", query] as const;

export async function fetchAdminReservations(
  query: AdminReservationListQuery,
): Promise<AdminReservationListResponse> {
  const params = new URLSearchParams({
    limit: String(query.limit),
    locationSlug: query.locationSlug,
  });
  if (query.q) params.set("q", query.q);
  return fetchJson<AdminReservationListResponse>(
    `/api/admin/stock/reservations/active?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function postStockCount(
  body: AdminStockCountRequest,
): Promise<AdminStockBalanceSummary> {
  return fetchJson<AdminStockBalanceSummary>(
    "/api/admin/stock/balances/count",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}
