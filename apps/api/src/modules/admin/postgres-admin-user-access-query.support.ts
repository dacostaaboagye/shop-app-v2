import type {
  AdminUserAccessActivityEvent,
  AdminUserAccessLocation,
  AdminUserPermissionOverride,
  AdminUserResolvedPermission,
  AdminUserRoleAssignment,
} from "@shop/contracts";

export type UserDetailRow = {
  email: string;
  firstName: string;
  id: string;
  lastLoginAt: Date | null;
  lastName: string;
  preferredPortal: "admin" | "agent" | "manager" | "supplier" | "worker" | null;
  requiresPasswordChange: boolean;
  slug: string;
  status: "active" | "deactivated" | "suspended";
};

export type RoleAssignmentRow = Omit<AdminUserRoleAssignment, "assignedAt"> & {
  assignedAt: Date;
};

export type UserOverrideRow = Omit<AdminUserPermissionOverride, "createdAt"> & {
  createdAt: Date;
};

export type ActivityRow = Omit<AdminUserAccessActivityEvent, "occurredAt"> & {
  occurredAt: Date;
};

export type PermissionAssignmentRow = {
  description: string;
  effect: "allow" | "deny" | null;
  key: string;
  locationId: string | null;
  locationName: string | null;
  locationSlug: string | null;
  source: "override" | "role";
};

type EffectiveScope = AdminUserAccessLocation & { locationId: string | null };

const PORTAL_ROLE_MAP = {
  admin: "admin",
  agent: "agent",
  manager: "manager",
  supplier: "supplier",
  worker: "worker",
} as const;

export function deriveAvailablePortals(
  roleAssignments: readonly Pick<AdminUserRoleAssignment, "roleSlug">[],
) {
  const portals = new Set<
    "admin" | "agent" | "manager" | "supplier" | "worker"
  >();

  for (const assignment of roleAssignments) {
    const portal =
      PORTAL_ROLE_MAP[assignment.roleSlug as keyof typeof PORTAL_ROLE_MAP];

    if (portal) {
      portals.add(portal);
    }
  }

  return [...portals].sort((left, right) => left.localeCompare(right));
}

export function mergeAssignedLocations(
  roleAssignments: readonly Pick<
    AdminUserRoleAssignment,
    "locationName" | "locationSlug"
  >[],
  userOverrides: readonly Pick<
    AdminUserPermissionOverride,
    "locationName" | "locationSlug"
  >[],
) {
  const locations = new Map<string, AdminUserAccessLocation>();

  for (const record of [...roleAssignments, ...userOverrides]) {
    if (!record.locationSlug || !record.locationName) {
      continue;
    }

    locations.set(record.locationSlug, {
      locationName: record.locationName,
      locationSlug: record.locationSlug,
    });
  }

  return [...locations.values()].sort((left, right) =>
    left.locationName.localeCompare(right.locationName),
  );
}

export function resolveEffectivePermissions(
  assignments: readonly PermissionAssignmentRow[],
  assignedLocations: readonly AdminUserAccessLocation[],
): AdminUserResolvedPermission[] {
  const locationIds = new Map<string, string>();

  for (const assignment of assignments) {
    if (assignment.locationId && assignment.locationSlug) {
      locationIds.set(assignment.locationSlug, assignment.locationId);
    }
  }

  const scopes: Array<EffectiveScope | null> = [
    null,
    ...assignedLocations.map((location) => ({
      ...location,
      locationId: locationIds.get(location.locationSlug) ?? null,
    })),
  ];
  const resolved: AdminUserResolvedPermission[] = [];

  for (const scope of scopes) {
    const effective = new Map<string, AdminUserResolvedPermission>();

    for (const assignment of assignments) {
      if (!matchesScope(assignment.locationId, scope?.locationId)) {
        continue;
      }

      if (assignment.source === "role") {
        effective.set(assignment.key, {
          description: assignment.description,
          key: assignment.key,
          locationName: scope?.locationName ?? null,
          locationSlug: scope?.locationSlug ?? null,
          source: "role",
        });
        continue;
      }

      if (assignment.effect === "deny") {
        effective.delete(assignment.key);
        continue;
      }

      effective.set(assignment.key, {
        description: assignment.description,
        key: assignment.key,
        locationName: scope?.locationName ?? null,
        locationSlug: scope?.locationSlug ?? null,
        source: "override",
      });
    }

    resolved.push(...effective.values());
  }

  return resolved.sort((left, right) => {
    const scopeCompare = (left.locationName ?? "").localeCompare(
      right.locationName ?? "",
    );

    if (scopeCompare !== 0) {
      return scopeCompare;
    }

    return left.key.localeCompare(right.key);
  });
}

function matchesScope(
  assignmentLocationId: string | null,
  scopeLocationId: string | null | undefined,
) {
  if (!assignmentLocationId) {
    return true;
  }

  return assignmentLocationId === scopeLocationId;
}
