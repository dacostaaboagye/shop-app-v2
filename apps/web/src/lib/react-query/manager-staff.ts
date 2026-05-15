import type {
  LocationStaffListResponse,
  ManagerCreateWorkerRequest,
  ManagerCreateWorkerResponse,
} from "@shop/contracts";
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

export async function createManagerWorker(
  input: ManagerCreateWorkerRequest,
): Promise<ManagerCreateWorkerResponse> {
  return fetchJson<ManagerCreateWorkerResponse>(
    "/api/manager/staff",
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}
