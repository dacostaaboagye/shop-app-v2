import type {
  AdminCreateLocationRequest,
  AdminCreateLocationResponse,
  AdminLocationStaffListResponse,
  AdminLocationSummary,
  AdminUpdateLocationRequest,
  AdminUpdateLocationResponse,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const adminLocationQueryKey = (slug: string) =>
  ["admin", "locations", slug] as const;

export const adminLocationStaffQueryKey = (slug: string) =>
  ["admin", "locations", slug, "staff"] as const;

export async function fetchAdminLocation(
  slug: string,
): Promise<AdminLocationSummary> {
  return fetchJson<AdminLocationSummary>(
    `/api/admin/locations/${encodeURIComponent(slug)}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchAdminLocationStaff(
  slug: string,
): Promise<AdminLocationStaffListResponse> {
  return fetchJson<AdminLocationStaffListResponse>(
    `/api/admin/locations/${encodeURIComponent(slug)}/staff`,
    undefined,
    { auth: "required" },
  );
}

export async function createAdminLocation(
  input: AdminCreateLocationRequest,
): Promise<AdminCreateLocationResponse> {
  return fetchJson<AdminCreateLocationResponse>(
    "/api/admin/locations",
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function updateAdminLocation(
  slug: string,
  input: AdminUpdateLocationRequest,
): Promise<AdminUpdateLocationResponse> {
  return fetchJson<AdminUpdateLocationResponse>(
    `/api/admin/locations/${encodeURIComponent(slug)}`,
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
    { auth: "required" },
  );
}
