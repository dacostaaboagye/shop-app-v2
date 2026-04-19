"use client";

import type {
  AdminUserAccessDetail,
  AdminUserPermissionOverride,
  AdminUserRoleAssignment,
} from "@shop/contracts";
import { getAppErrorMessage } from "@/lib/errors/app-error";

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

const LOCATION_SCOPED_ROLE_SLUGS = new Set(["manager", "worker"]);

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
        description: roleRequiresLocationScope(state.roleSlug)
          ? "Role assignments are audited, take effect immediately, and require a location scope."
          : "Role assignments are audited and take effect immediately.",
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

export function getReasonDialogKey(state: ReasonDialogState) {
  switch (state.kind) {
    case "allow-override":
      return `${state.kind}:${state.permissionKey}`;
    case "assign-role":
      return `${state.kind}:${state.roleSlug}`;
    case "deny-override":
      return `${state.kind}:${state.permissionKey}`;
    case "remove-override":
      return `${state.kind}:${state.override.permissionKey}:${state.override.locationSlug ?? "global"}`;
    case "revoke-role":
      return `${state.kind}:${state.assignment.roleSlug}:${state.assignment.locationSlug ?? "global"}`;
    default:
      return state.kind;
  }
}

export function roleRequiresLocationScope(roleSlug: string) {
  return LOCATION_SCOPED_ROLE_SLUGS.has(roleSlug);
}

export function isReasonDialogPending(input: {
  formIsSubmitting: boolean;
  mutationIsPending: boolean;
}) {
  return input.formIsSubmitting || input.mutationIsPending;
}

export function getQueryErrorMessage(...errors: Array<unknown | null>) {
  for (const error of errors) {
    if (error) {
      return getAppErrorMessage(error, {
        fallbackDetail: "An unexpected error occurred.",
      });
    }
  }

  return "An unexpected error occurred.";
}
