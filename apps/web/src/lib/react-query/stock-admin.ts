import type {
  ActiveReservationListQuery,
  ActiveReservationListResponse,
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
