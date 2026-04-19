import type { LocationStaffListResponse } from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const managerStaffQueryKey = (locationId: string) =>
  ["manager", "staff", locationId] as const;

export async function fetchManagerStaff(
  locationId: string,
): Promise<LocationStaffListResponse> {
  const params = new URLSearchParams({ locationId });

  return fetchJson<LocationStaffListResponse>(
    `/api/manager/staff?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}
