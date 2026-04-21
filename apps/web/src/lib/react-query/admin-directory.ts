import type {
  AdminLocationListQuery,
  AdminLocationListResponse,
  AdminStaffListQuery,
  AdminStaffListResponse,
  AdminUserListQuery,
  AdminUserListResponse,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const adminUsersQueryKey = (query: AdminUserListQuery) =>
  ["admin", "users", query] as const;

export const adminStaffQueryKey = (query: AdminStaffListQuery) =>
  ["admin", "staff", query] as const;

export const adminLocationsQueryKey = (query: AdminLocationListQuery) =>
  ["admin", "locations", query] as const;

export async function fetchAdminUsers(
  query: AdminUserListQuery,
): Promise<AdminUserListResponse> {
  return fetchJson<AdminUserListResponse>(
    `/api/admin/users?${buildSearchParams(query).toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchAdminStaff(
  query: AdminStaffListQuery,
): Promise<AdminStaffListResponse> {
  return fetchJson<AdminStaffListResponse>(
    `/api/admin/staff?${buildSearchParams(query).toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchAdminLocations(
  query: AdminLocationListQuery,
): Promise<AdminLocationListResponse> {
  return fetchJson<AdminLocationListResponse>(
    `/api/admin/locations?${buildSearchParams(query).toString()}`,
    undefined,
    { auth: "required" },
  );
}

function buildSearchParams(
  query: AdminLocationListQuery | AdminStaffListQuery | AdminUserListQuery,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    searchParams.set(key, String(value));
  }

  return searchParams;
}
