import type {
  ActiveReservationListQuery,
  ActiveReservationListResponse,
  AdminOpeningStockRequest,
  AdminOpeningStockResponse,
  AdminReservationListQuery,
  AdminReservationListResponse,
  AdminStockBalanceListQuery,
  AdminStockBalanceListResponse,
  AdminStockCountRequest,
  AdminStockCountResponse,
  LocationReservationQuery,
  LocationStockBalanceQuery,
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
    page: String(query.page),
    pageSize: String(query.pageSize),
  });

  if (query.brandSlug) {
    params.set("brandSlug", query.brandSlug);
  }

  if (query.categorySlug) {
    params.set("categorySlug", query.categorySlug);
  }

  if (query.locationSlug) {
    params.set("locationSlug", query.locationSlug);
  }

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
  });
  if (query.brandSlug) params.set("brandSlug", query.brandSlug);
  if (query.categorySlug) params.set("categorySlug", query.categorySlug);
  if (query.locationSlug) params.set("locationSlug", query.locationSlug);
  if (query.q) params.set("q", query.q);
  return fetchJson<AdminReservationListResponse>(
    `/api/admin/stock/reservations/active?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export const managerReservationsQueryKey = (
  query: Partial<LocationReservationQuery>,
) => ["stock", "reservations", "manager", query] as const;

export async function fetchManagerReservations(
  query: LocationReservationQuery,
): Promise<AdminReservationListResponse> {
  const params = new URLSearchParams({
    limit: String(query.limit),
    locationId: query.locationId,
  });
  if (query.q) params.set("q", query.q);
  return fetchJson<AdminReservationListResponse>(
    `/api/manager/stock/reservations/active?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export const workerStockBalancesQueryKey = (
  query: Partial<LocationStockBalanceQuery>,
) => ["stock", "balances", "worker", query] as const;

export const managerStockBalancesQueryKey = (
  query: Partial<LocationStockBalanceQuery>,
) => ["stock", "balances", "manager", query] as const;

export async function fetchWorkerStockBalances(
  query: LocationStockBalanceQuery,
): Promise<AdminStockBalanceListResponse> {
  const params = new URLSearchParams({
    locationId: query.locationId,
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.q) params.set("q", query.q);
  return fetchJson<AdminStockBalanceListResponse>(
    `/api/worker/stock/balances?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchManagerStockBalances(
  query: LocationStockBalanceQuery,
): Promise<AdminStockBalanceListResponse> {
  const params = new URLSearchParams({
    locationId: query.locationId,
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.q) params.set("q", query.q);
  return fetchJson<AdminStockBalanceListResponse>(
    `/api/manager/stock/balances?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function postStockCount(
  body: AdminStockCountRequest,
): Promise<AdminStockCountResponse> {
  return fetchJson<AdminStockCountResponse>(
    "/api/admin/stock/balances/count",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function postOpeningStock(
  body: AdminOpeningStockRequest,
): Promise<AdminOpeningStockResponse> {
  return fetchJson<AdminOpeningStockResponse>(
    "/api/admin/stock/balances/opening",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function postManagerOpeningStock(
  body: AdminOpeningStockRequest,
): Promise<AdminOpeningStockResponse> {
  return fetchJson<AdminOpeningStockResponse>(
    "/api/manager/stock/balances/opening",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function postManagerStockCount(
  body: AdminStockCountRequest,
): Promise<AdminStockCountResponse> {
  return fetchJson<AdminStockCountResponse>(
    "/api/manager/stock/balances/count",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}
