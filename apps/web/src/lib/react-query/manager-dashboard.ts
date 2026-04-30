import type { ManagerDashboardSummaryResponse } from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const managerDashboardSummaryQueryKey = (locationId: string) =>
  ["manager", "dashboard", locationId] as const;

export async function fetchManagerDashboardSummary(
  locationId: string,
): Promise<ManagerDashboardSummaryResponse> {
  const params = new URLSearchParams({ locationId });

  return fetchJson<ManagerDashboardSummaryResponse>(
    `/api/manager/dashboard/summary?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}
