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

type ActiveLocationScopeRow = {
  locationId: string;
  locationName: string;
  locationSlug: string;
};

export class PostgresPermissionRepository
  implements PermissionResolutionRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getPermissionAssignments(
    userId: string,
  ): Promise<PermissionAssignmentRow[]> {
    const rolePermissionsQuery = this.db
      .select({
        key: permissions.key,
        locationId: userRoles.locationId,
        effect: sql<"allow" | "deny" | null>`NULL`.as("effect"),
        source: sql<"role" | "override">`'role'`.as("source"),
      })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(and(eq(userRoles.userId, userId), isNull(userRoles.revokedAt)));

    const overridesQuery = this.db
      .select({
        key: permissions.key,
        locationId: userPermissionOverrides.locationId,
        effect: userPermissionOverrides.effect,
        source: sql<"role" | "override">`'override'`.as("source"),
      })
      .from(userPermissionOverrides)
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
        effect: sql<"allow" | "deny" | null>`"effect"`,
        source: sql<"role" | "override">`"source"`,
      })
      .from(rolePermissionsQuery.unionAll(overridesQuery).as("assignments"))
      .orderBy(sql`"source"`, sql`"key"`);

    return rows.map((row) => ({
      effect: row.effect,
      key: row.key,
      locationId: row.locationId,
      source: row.source,
    }));
  }

  async getActiveLocationScopes(userId: string): Promise<ActiveLocationScopeRow[]> {
    const [fromRoles, fromOverrides] = await Promise.all([
      this.db
        .select({
          locationId: locations.id,
          locationName: locations.name,
          locationSlug: locations.slug,
        })
        .from(userRoles)
        .innerJoin(locations, eq(locations.id, userRoles.locationId))
        .where(and(eq(userRoles.userId, userId), isNull(userRoles.revokedAt))),

      this.db
        .select({
          locationId: locations.id,
          locationName: locations.name,
          locationSlug: locations.slug,
        })
        .from(userPermissionOverrides)
        .innerJoin(locations, eq(locations.id, userPermissionOverrides.locationId))
        .where(
          and(
            eq(userPermissionOverrides.userId, userId),
            isNull(userPermissionOverrides.removedAt),
          ),
        ),
    ]);

    const seen = new Set<string>();
    const merged: ActiveLocationScopeRow[] = [];

    for (const row of [...fromRoles, ...fromOverrides]) {
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
