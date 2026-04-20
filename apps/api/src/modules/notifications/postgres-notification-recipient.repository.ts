import {
  permissions,
  rolePermissions,
  userPermissionOverrides,
  userRoles,
  users,
} from "@shop/database";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { ApiDatabase } from "../../infrastructure/database.js";

export class PostgresNotificationRecipientRepository {
  constructor(private readonly db: ApiDatabase) {}

  async filterActiveUserIds(userIds: readonly string[]): Promise<string[]> {
    if (!userIds.length) {
      return [];
    }

    const rows = await this.db
      .select({ userId: users.id })
      .from(users)
      .where(and(inArray(users.id, [...userIds]), eq(users.status, "active")));

    return rows.map((row) => row.userId);
  }

  async listCandidateUserIdsWithPermission(input: {
    locationId?: string;
    permission: string;
  }): Promise<string[]> {
    const roleRows = await this.db
      .select({ userId: users.id })
      .from(userRoles)
      .innerJoin(users, eq(users.id, userRoles.userId))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(
        and(
          eq(users.status, "active"),
          isNull(userRoles.revokedAt),
          eq(permissions.key, input.permission),
          locationScopeClause(userRoles.locationId, input.locationId),
        ),
      );

    const overrideRows = await this.db
      .select({ userId: users.id })
      .from(userPermissionOverrides)
      .innerJoin(users, eq(users.id, userPermissionOverrides.userId))
      .innerJoin(
        permissions,
        eq(permissions.id, userPermissionOverrides.permissionId),
      )
      .where(
        and(
          eq(users.status, "active"),
          isNull(userPermissionOverrides.removedAt),
          eq(permissions.key, input.permission),
          locationScopeClause(userPermissionOverrides.locationId, input.locationId),
        ),
      );

    return Array.from(
      new Set([...roleRows, ...overrideRows].map((row) => row.userId)),
    ).sort((left, right) => left.localeCompare(right));
  }
}

function locationScopeClause(
  column: AnyPgColumn,
  locationId: string | undefined,
) {
  if (locationId) {
    return or(isNull(column), eq(column, locationId));
  }

  return isNull(column);
}
