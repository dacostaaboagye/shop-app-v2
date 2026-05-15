import type {
  AdminAssignUserRoleRequest,
  AdminCreateUserRequest,
  AdminCreateUserResponse,
  AdminForceUserPasswordResetRequest,
  AdminRemoveUserPermissionOverrideRequest,
  AdminRevokeUserRoleRequest,
  AdminSetUserPermissionOverrideRequest,
  AdminUpdateUserProfileRequest,
  AdminUpdateUserStatusRequest,
  AdminUserAccessDetail,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const adminUserAccessDetailQueryKey = (slug: string) =>
  ["admin", "access", "users", slug] as const;

export async function fetchAdminUserAccessDetail(
  slug: string,
): Promise<AdminUserAccessDetail> {
  return fetchJson<AdminUserAccessDetail>(
    `/api/admin/access/users/${encodeURIComponent(slug)}`,
    undefined,
    { auth: "required" },
  );
}

export async function createAdminUser(
  input: AdminCreateUserRequest,
): Promise<AdminCreateUserResponse> {
  return fetchJson<AdminCreateUserResponse>(
    "/api/admin/access/users",
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function assignAdminUserRole(
  slug: string,
  input: AdminAssignUserRoleRequest,
) {
  return fetchJson<void>(
    `/api/admin/access/users/${encodeURIComponent(slug)}/roles`,
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function revokeAdminUserRole(
  slug: string,
  roleSlug: string,
  input: AdminRevokeUserRoleRequest,
) {
  return fetchJson<void>(
    `/api/admin/access/users/${encodeURIComponent(slug)}/roles/${encodeURIComponent(roleSlug)}`,
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    },
    { auth: "required" },
  );
}

export async function setAdminUserPermissionOverride(
  slug: string,
  input: AdminSetUserPermissionOverrideRequest,
) {
  return fetchJson<void>(
    `/api/admin/access/users/${encodeURIComponent(slug)}/permissions/override`,
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function removeAdminUserPermissionOverride(
  slug: string,
  permissionKey: string,
  input: AdminRemoveUserPermissionOverrideRequest,
) {
  return fetchJson<void>(
    `/api/admin/access/users/${encodeURIComponent(slug)}/permissions/override/${encodeURIComponent(permissionKey)}`,
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    },
    { auth: "required" },
  );
}

export async function updateAdminUserProfile(
  slug: string,
  input: AdminUpdateUserProfileRequest,
) {
  return fetchJson<void>(
    `/api/admin/access/users/${encodeURIComponent(slug)}/profile`,
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
    { auth: "required" },
  );
}

export async function updateAdminUserStatus(
  slug: string,
  input: AdminUpdateUserStatusRequest,
) {
  return fetchJson<void>(
    `/api/admin/access/users/${encodeURIComponent(slug)}/status`,
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
    { auth: "required" },
  );
}

export async function forceAdminUserPasswordReset(
  slug: string,
  input: AdminForceUserPasswordResetRequest,
) {
  return fetchJson<void>(
    `/api/admin/access/users/${encodeURIComponent(slug)}/force-password-reset`,
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}
