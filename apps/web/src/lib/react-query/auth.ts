import type {
  AuthPermissionSet,
  AuthUser,
  PortalKey,
  UpdateProfileRequest,
} from "@shop/contracts";
import type { QueryKey } from "@tanstack/react-query";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const authQueryKey = ["auth"] as const satisfies QueryKey;
export const currentUserQueryKey = ["auth", "current-user"] as const;
export const currentUserPermissionsQueryKeyPrefix = [
  "auth",
  "current-user-permissions",
] as const satisfies QueryKey;
export const currentUserPermissionsQueryKey = [
  ...currentUserPermissionsQueryKeyPrefix,
  "current-session",
] as const satisfies QueryKey;

export function getCurrentUserPermissionsQueryKey(userSlug: string | null) {
  return [
    ...currentUserPermissionsQueryKeyPrefix,
    userSlug ?? "anonymous",
  ] as const satisfies QueryKey;
}

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
  await updateCurrentUserProfile({ preferredPortal: portal });
}

export async function updateCurrentUserProfile(
  profile: UpdateProfileRequest,
): Promise<void> {
  await fetchJson<void>(
    "/api/auth/me",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    },
    { auth: "required" },
  );
}
