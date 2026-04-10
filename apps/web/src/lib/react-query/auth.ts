import type { AuthPermissionSet, AuthUser, PortalKey } from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const currentUserQueryKey = ["auth", "current-user"] as const;
export const currentUserPermissionsQueryKey = [
  "auth",
  "current-user-permissions",
] as const;

export async function fetchCurrentUser(): Promise<AuthUser> {
  return fetchJson<AuthUser>("/api/auth/me", undefined, {
    auth: "required",
  });
}

export async function fetchCurrentUserPermissions(): Promise<AuthPermissionSet> {
  return fetchJson<AuthPermissionSet>("/api/auth/me/permissions", undefined, {
    auth: "required",
  });
}

export async function setPreferredPortal(
  portal: PortalKey | null,
): Promise<void> {
  await fetchJson<void>(
    "/api/auth/me",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredPortal: portal }),
    },
    { auth: "required" },
  );
}
