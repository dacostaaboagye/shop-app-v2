"use client";

import type {
  AdminUserAccessDetail,
  AdminUserPermissionOverride,
  AdminUserRoleAssignment,
} from "@shop/contracts";

export type PermissionState =
  | { kind: "allow-override" }
  | { kind: "deny-override" }
  | { kind: "not-granted" }
  | { kind: "role-grant" };

export type ReasonDialogState =
  | { kind: "allow-override"; permissionKey: string }
  | { kind: "assign-role"; roleName: string; roleSlug: string }
  | { kind: "closed" }
  | { kind: "deny-override"; permissionKey: string }
  | { kind: "remove-override"; override: AdminUserPermissionOverride }
  | { kind: "revoke-role"; assignment: AdminUserRoleAssignment };

export function derivePermissionState(
  permissionKey: string,
  effectivePermissions: AdminUserAccessDetail["effectivePermissions"],
  userOverrides: readonly AdminUserPermissionOverride[],
): PermissionState {
  const override = userOverrides.find(
    (item) => item.permissionKey === permissionKey,
  );

  if (override) {
    return override.effect === "allow"
      ? { kind: "allow-override" }
      : { kind: "deny-override" };
  }

  return effectivePermissions.some((item) => item.key === permissionKey)
    ? { kind: "role-grant" }
    : { kind: "not-granted" };
}

export function getDialogMeta(state: ReasonDialogState) {
  switch (state.kind) {
    case "allow-override":
      return {
        description: `Set an allow override for "${state.permissionKey}". This grants access even if no role covers it.`,
        destructive: false,
        submitLabel: "Allow",
        title: "Allow permission",
      };
    case "assign-role":
      return {
        description:
          "Role assignments are audited and take effect immediately.",
        destructive: false,
        submitLabel: "Assign role",
        title: `Assign "${state.roleName}"`,
      };
    case "deny-override":
      return {
        description: `Set a deny override for "${state.permissionKey}". This blocks access even if a role grants it.`,
        destructive: true,
        submitLabel: "Deny",
        title: "Deny permission",
      };
    case "remove-override":
      return {
        description: `Remove the ${state.override.effect} override for "${state.override.permissionKey}". Access will revert to what the user's roles provide.`,
        destructive: true,
        submitLabel: "Remove override",
        title: "Remove override",
      };
    case "revoke-role":
      return {
        description: `Revoke this role${state.assignment.locationName ? ` (scoped to ${state.assignment.locationName})` : " (global)"}. Takes effect immediately.`,
        destructive: true,
        submitLabel: "Revoke role",
        title: `Revoke "${state.assignment.roleName}"`,
      };
    default:
      return {
        description: "Provide a reason for this change.",
        destructive: false,
        submitLabel: "Confirm",
        title: "Confirm",
      };
  }
}

export function getQueryErrorMessage(...errors: Array<unknown | null>) {
  for (const error of errors) {
    if (error instanceof Error) {
      return error.message;
    }
  }

  return "An unexpected error occurred.";
}
