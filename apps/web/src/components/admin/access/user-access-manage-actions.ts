"use client";

import {
  assignAdminUserRole,
  removeAdminUserPermissionOverride,
  revokeAdminUserRole,
  setAdminUserPermissionOverride,
} from "@/lib/react-query/admin-user-access";
import type { ReasonDialogState } from "./user-access-manage-support";

export async function submitUserAccessReasonAction(input: {
  locationSlug: string;
  reason: string;
  slug: string;
  state: ReasonDialogState;
}) {
  const { locationSlug, reason, slug, state } = input;

  switch (state.kind) {
    case "allow-override":
      return setAdminUserPermissionOverride(slug, {
        effect: "allow",
        locationSlug: null,
        permissionKey: state.permissionKey,
        reason,
      });
    case "assign-role":
      return assignAdminUserRole(slug, {
        locationSlug: locationSlug || null,
        reason,
        roleSlug: state.roleSlug,
      });
    case "deny-override":
      return setAdminUserPermissionOverride(slug, {
        effect: "deny",
        locationSlug: null,
        permissionKey: state.permissionKey,
        reason,
      });
    case "remove-override":
      return removeAdminUserPermissionOverride(
        slug,
        state.override.permissionKey,
        {
          locationSlug: state.override.locationSlug,
          reason,
        },
      );
    case "revoke-role":
      return revokeAdminUserRole(slug, state.assignment.roleSlug, {
        locationSlug: state.assignment.locationSlug,
        reason,
      });
    default:
      throw new Error("No access action is selected.");
  }
}
