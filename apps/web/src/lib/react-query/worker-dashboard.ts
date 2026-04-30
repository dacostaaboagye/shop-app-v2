import type { WorkerDashboardSummaryResponse } from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const workerDashboardSummaryQueryKey = (locationId: string) =>
  ["worker", "dashboard", locationId] as const;

export async function fetchWorkerDashboardSummary(
  locationId: string,
): Promise<WorkerDashboardSummaryResponse> {
  const params = new URLSearchParams({ locationId });

  return fetchJson<WorkerDashboardSummaryResponse>(
    `/api/worker/dashboard/summary?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}
