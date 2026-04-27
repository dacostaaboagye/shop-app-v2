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

  async findActiveRecipientBySlug(input: { userSlug: string }): Promise<{
    email: string | null;
    firstName: string | null;
    notificationEmailEnabled: boolean;
    notificationInAppEnabled: boolean;
    userId: string;
    userSlug: string;
  } | null> {
    const row = await this.db
      .select({
        email: users.email,
        firstName: users.firstName,
        notificationEmailEnabled: users.notificationEmailEnabled,
        notificationInAppEnabled: users.notificationInAppEnabled,
        userId: users.id,
        userSlug: users.slug,
      })
      .from(users)
      .where(and(eq(users.slug, input.userSlug), eq(users.status, "active")))
      .limit(1);

    return row[0] ?? null;
  }

  async filterActiveUserIds(userIds: readonly string[]): Promise<string[]> {
    if (!userIds.length) {
      return [];
    }

    const rows = await this.db
      .select({ userId: users.id })
      .from(users)
      .where(
        and(
          inArray(users.id, [...userIds]),
          eq(users.status, "active"),
          eq(users.notificationInAppEnabled, true),
        ),
      );

    return rows.map((row) => row.userId);
  }

  async listCandidateUserIdsWithPermission(input: {
    locationId?: string;
    permission: string;
  }): Promise<string[]> {
    const recipients = await this.listActiveRecipientsWithPermission(input);
    return recipients.map((recipient) => recipient.userId);
  }

  async listActiveRecipientsWithPermission(input: {
    locationId?: string;
    permission: string;
  }): Promise<
    Array<{
      email: string | null;
      firstName: string | null;
      notificationEmailEnabled: boolean;
      notificationInAppEnabled: boolean;
      userId: string;
    }>
  > {
    const roleRows = await this.db
      .select({
        email: users.email,
        firstName: users.firstName,
        notificationEmailEnabled: users.notificationEmailEnabled,
        notificationInAppEnabled: users.notificationInAppEnabled,
        userId: users.id,
      })
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
      .select({
        email: users.email,
        firstName: users.firstName,
        notificationEmailEnabled: users.notificationEmailEnabled,
        notificationInAppEnabled: users.notificationInAppEnabled,
        userId: users.id,
      })
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
          locationScopeClause(
            userPermissionOverrides.locationId,
            input.locationId,
          ),
        ),
      );

    const recipients = new Map<
      string,
      {
        email: string | null;
        firstName: string | null;
        notificationEmailEnabled: boolean;
        notificationInAppEnabled: boolean;
        userId: string;
        userSlug?: string;
      }
    >();

    for (const row of [...roleRows, ...overrideRows]) {
      recipients.set(row.userId, row);
    }

    return Array.from(recipients.values()).sort((left, right) =>
      left.userId.localeCompare(right.userId),
    );
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
