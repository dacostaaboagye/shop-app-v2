import type {
  AdminAuditListQuery,
  AdminAuditListResponse,
  AdminCreateRoleRequest,
  AdminPermissionListQuery,
  AdminPermissionListResponse,
  AdminRoleDetail,
  AdminRoleListQuery,
  AdminRoleListResponse,
  AdminUpdateRoleRequest,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const adminAuditQueryKey = (query: AdminAuditListQuery) =>
  ["admin", "access", "audit", query] as const;

export const adminPermissionsQueryKey = (query: AdminPermissionListQuery) =>
  ["admin", "access", "permissions", query] as const;

export const adminRoleDetailQueryKey = (slug: string) =>
  ["admin", "access", "roles", slug] as const;

export const adminRolesQueryKey = (query: AdminRoleListQuery) =>
  ["admin", "access", "roles", query] as const;

export async function fetchAdminAudit(
  query: AdminAuditListQuery,
): Promise<AdminAuditListResponse> {
  return fetchJson<AdminAuditListResponse>(
    `/api/admin/access/audit?${buildSearchParams(query).toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchAdminPermissions(
  query: AdminPermissionListQuery,
): Promise<AdminPermissionListResponse> {
  return fetchJson<AdminPermissionListResponse>(
    `/api/admin/access/permissions?${buildSearchParams(query).toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchAdminRole(slug: string): Promise<AdminRoleDetail> {
  return fetchJson<AdminRoleDetail>(
    `/api/admin/access/roles/${encodeURIComponent(slug)}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchAdminRoles(
  query: AdminRoleListQuery,
): Promise<AdminRoleListResponse> {
  return fetchJson<AdminRoleListResponse>(
    `/api/admin/access/roles?${buildSearchParams(query).toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function createAdminRole(
  input: AdminCreateRoleRequest,
): Promise<AdminRoleDetail> {
  return fetchJson<AdminRoleDetail>(
    "/api/admin/access/roles",
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function updateAdminRole(
  slug: string,
  input: AdminUpdateRoleRequest,
): Promise<AdminRoleDetail> {
  return fetchJson<AdminRoleDetail>(
    `/api/admin/access/roles/${encodeURIComponent(slug)}`,
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
    { auth: "required" },
  );
}

function buildSearchParams(query: Record<string, number | string>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    searchParams.set(key, String(value));
  }

  return searchParams;
}
