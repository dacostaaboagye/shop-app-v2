import {
  locations,
  permissions,
  rolePermissions,
  userPermissionOverrides,
  userRoles,
} from "@shop/database";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { PermissionResolutionRepository } from "./permission-resolution.service.js";

type PermissionAssignmentRow = {
  effect: "allow" | "deny" | null;
  key: string;
  locationId: string | null;
  source: "override" | "role";
};

type PermissionAssignmentQueryRow = PermissionAssignmentRow & {
  locationStatus: "active" | "inactive" | null;
};

type ActiveLocationScopeRow = {
  locationId: string;
  locationName: string;
  locationSlug: string;
};

type ActiveLocationScopeQueryRow = ActiveLocationScopeRow & {
  locationStatus: "active" | "inactive";
};

export class PostgresPermissionRepository
  implements PermissionResolutionRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getAllActiveLocationScopes(): Promise<ActiveLocationScopeRow[]> {
    return this.db
      .select({
        locationId: locations.id,
        locationName: locations.name,
        locationSlug: locations.slug,
      })
      .from(locations)
      .where(eq(locations.status, "active"))
      .orderBy(locations.name, locations.slug);
  }

  async getPermissionAssignments(
    userId: string,
  ): Promise<PermissionAssignmentRow[]> {
    const rolePermissionsQuery = this.db
      .select({
        key: permissions.key,
        locationId: userRoles.locationId,
        locationStatus: locations.status,
        effect: sql<"allow" | "deny" | null>`NULL`.as("effect"),
        source: sql<"role" | "override">`'role'`.as("source"),
      })
      .from(userRoles)
      .leftJoin(locations, eq(locations.id, userRoles.locationId))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(and(eq(userRoles.userId, userId), isNull(userRoles.revokedAt)));

    const overridesQuery = this.db
      .select({
        key: permissions.key,
        locationId: userPermissionOverrides.locationId,
        locationStatus: locations.status,
        effect: userPermissionOverrides.effect,
        source: sql<"role" | "override">`'override'`.as("source"),
      })
      .from(userPermissionOverrides)
      .leftJoin(locations, eq(locations.id, userPermissionOverrides.locationId))
      .innerJoin(
        permissions,
        eq(permissions.id, userPermissionOverrides.permissionId),
      )
      .where(
        and(
          eq(userPermissionOverrides.userId, userId),
          isNull(userPermissionOverrides.removedAt),
        ),
      );

    const rows = await this.db
      .select({
        key: sql<string>`"key"`,
        locationId: sql<string | null>`"location_id"`,
        locationStatus: sql<"active" | "inactive" | null>`"status"`,
        effect: sql<"allow" | "deny" | null>`"effect"`,
        source: sql<"role" | "override">`"source"`,
      })
      .from(rolePermissionsQuery.unionAll(overridesQuery).as("assignments"))
      .orderBy(sql`"source"`, sql`"key"`);

    return filterActiveLocationPermissionAssignments(rows);
  }

  async getActiveLocationScopes(
    userId: string,
  ): Promise<ActiveLocationScopeRow[]> {
    const [fromRoles, fromOverrides] = await Promise.all([
      this.db
        .select({
          locationId: locations.id,
          locationName: locations.name,
          locationSlug: locations.slug,
          locationStatus: locations.status,
        })
        .from(userRoles)
        .innerJoin(locations, eq(locations.id, userRoles.locationId))
        .where(and(eq(userRoles.userId, userId), isNull(userRoles.revokedAt))),

      this.db
        .select({
          locationId: locations.id,
          locationName: locations.name,
          locationSlug: locations.slug,
          locationStatus: locations.status,
        })
        .from(userPermissionOverrides)
        .innerJoin(
          locations,
          eq(locations.id, userPermissionOverrides.locationId),
        )
        .where(
          and(
            eq(userPermissionOverrides.userId, userId),
            isNull(userPermissionOverrides.removedAt),
          ),
        ),
    ]);

    const seen = new Set<string>();
    const merged: ActiveLocationScopeRow[] = [];

    for (const row of filterActiveLocationScopes([
      ...fromRoles,
      ...fromOverrides,
    ])) {
      if (!seen.has(row.locationId)) {
        seen.add(row.locationId);
        merged.push(row);
      }
    }

    return merged.sort(
      (a, b) =>
        a.locationName.localeCompare(b.locationName) ||
        a.locationSlug.localeCompare(b.locationSlug),
    );
  }
}

export function filterActiveLocationPermissionAssignments(
  rows: readonly PermissionAssignmentQueryRow[],
): PermissionAssignmentRow[] {
  return rows
    .filter((row) => row.locationId === null || row.locationStatus === "active")
    .map((row) => ({
      effect: row.effect,
      key: row.key,
      locationId: row.locationId,
      source: row.source,
    }));
}

export function filterActiveLocationScopes(
  rows: readonly ActiveLocationScopeQueryRow[],
): ActiveLocationScopeRow[] {
  return rows
    .filter((row) => row.locationStatus === "active")
    .map((row) => ({
      locationId: row.locationId,
      locationName: row.locationName,
      locationSlug: row.locationSlug,
    }));
}
