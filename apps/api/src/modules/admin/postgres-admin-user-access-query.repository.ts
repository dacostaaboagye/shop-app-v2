import type { AdminUserAccessDetail } from "@shop/contracts";
import type { Pool } from "pg";
import type { AdminUserAccessQueryRepository } from "./admin-user-access-query.service.js";
import {
  type ActivityRow,
  deriveAvailablePortals,
  mergeAssignedLocations,
  type PermissionAssignmentRow,
  type RoleAssignmentRow,
  resolveEffectivePermissions,
  type UserDetailRow,
  type UserOverrideRow,
} from "./postgres-admin-user-access-query.support.js";

export class PostgresAdminUserAccessQueryRepository
  implements AdminUserAccessQueryRepository
{
  constructor(private readonly pool: Pick<Pool, "query">) {}

  async getUserAccessDetail(
    slug: string,
  ): Promise<AdminUserAccessDetail | null> {
    const userResult = await this.pool.query<UserDetailRow>(
      `
        SELECT
          users.id,
          users.slug,
          users.first_name AS "firstName",
          users.last_name AS "lastName",
          users.email,
          users.status,
          users.preferred_portal AS "preferredPortal",
          users.last_login_at AS "lastLoginAt",
          users.requires_password_change AS "requiresPasswordChange"
        FROM users
        WHERE users.slug = $1
        LIMIT 1
      `,
      [slug],
    );
    const user = userResult.rows[0];

    if (!user) {
      return null;
    }

    const [roleAssignmentsResult, userOverridesResult, recentActivityResult] =
      await Promise.all([
        this.pool.query<RoleAssignmentRow>(
          `
            SELECT
              roles.slug AS "roleSlug",
              roles.name AS "roleName",
              locations.slug AS "locationSlug",
              locations.name AS "locationName",
              NULLIF(
                TRIM(CONCAT_WS(' ', assigned_by.first_name, assigned_by.last_name)),
                ''
              ) AS "assignedByName",
              user_roles.assigned_at AS "assignedAt"
            FROM user_roles
            INNER JOIN roles ON roles.id = user_roles.role_id
            LEFT JOIN locations ON locations.id = user_roles.location_id
            LEFT JOIN users assigned_by ON assigned_by.id = user_roles.assigned_by
            WHERE user_roles.user_id = $1
              AND user_roles.revoked_at IS NULL
            ORDER BY
              locations.name ASC NULLS FIRST,
              roles.name ASC,
              user_roles.assigned_at DESC
          `,
          [user.id],
        ),
        this.pool.query<UserOverrideRow>(
          `
            SELECT
              permissions.key AS "permissionKey",
              permissions.description,
              user_permission_overrides.effect,
              locations.slug AS "locationSlug",
              locations.name AS "locationName",
              user_permission_overrides.reason,
              NULLIF(
                TRIM(CONCAT_WS(' ', set_by.first_name, set_by.last_name)),
                ''
              ) AS "setByName",
              user_permission_overrides.created_at AS "createdAt"
            FROM user_permission_overrides
            INNER JOIN permissions
              ON permissions.id = user_permission_overrides.permission_id
            LEFT JOIN locations ON locations.id = user_permission_overrides.location_id
            LEFT JOIN users set_by ON set_by.id = user_permission_overrides.set_by
            WHERE user_permission_overrides.user_id = $1
              AND user_permission_overrides.removed_at IS NULL
            ORDER BY
              user_permission_overrides.created_at DESC,
              user_permission_overrides.id DESC
          `,
          [user.id],
        ),
        this.pool.query<ActivityRow>(
          `
            SELECT
              auth_events.event_type AS "eventType",
              auth_events.ip_address AS "ipAddress",
              auth_events.user_agent AS "userAgent",
              auth_events.occurred_at AS "occurredAt"
            FROM auth_events
            WHERE auth_events.user_id = $1
            ORDER BY auth_events.occurred_at DESC, auth_events.id DESC
            LIMIT 12
          `,
          [user.id],
        ),
      ]);
    const permissionAssignments = await this.getPermissionAssignments(user.id);
    const assignedLocations = mergeAssignedLocations(
      roleAssignmentsResult.rows,
      userOverridesResult.rows,
    );

    return {
      assignedLocations,
      availablePortals: deriveAvailablePortals(roleAssignmentsResult.rows),
      effectivePermissions: resolveEffectivePermissions(
        permissionAssignments,
        assignedLocations,
      ),
      email: user.email,
      firstName: user.firstName,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      lastName: user.lastName,
      preferredPortal: user.preferredPortal,
      recentActivity: recentActivityResult.rows.map((row) => ({
        ...row,
        occurredAt: row.occurredAt.toISOString(),
      })),
      requiresPasswordChange: user.requiresPasswordChange,
      roleAssignments: roleAssignmentsResult.rows.map((row) => ({
        ...row,
        assignedAt: row.assignedAt.toISOString(),
      })),
      slug: user.slug,
      status: user.status,
      userOverrides: userOverridesResult.rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  private async getPermissionAssignments(userId: string) {
    const result = await this.pool.query<PermissionAssignmentRow>(
      `
        SELECT
          permissions.key AS "key",
          permissions.description,
          user_roles.location_id AS "locationId",
          locations.slug AS "locationSlug",
          locations.name AS "locationName",
          NULL::permission_override_effect AS "effect",
          'role'::text AS "source"
        FROM user_roles
        INNER JOIN role_permissions
          ON role_permissions.role_id = user_roles.role_id
        INNER JOIN permissions
          ON permissions.id = role_permissions.permission_id
        LEFT JOIN locations
          ON locations.id = user_roles.location_id
        WHERE user_roles.user_id = $1
          AND user_roles.revoked_at IS NULL

        UNION ALL

        SELECT
          permissions.key AS "key",
          permissions.description,
          user_permission_overrides.location_id AS "locationId",
          locations.slug AS "locationSlug",
          locations.name AS "locationName",
          user_permission_overrides.effect AS "effect",
          'override'::text AS "source"
        FROM user_permission_overrides
        INNER JOIN permissions
          ON permissions.id = user_permission_overrides.permission_id
        LEFT JOIN locations
          ON locations.id = user_permission_overrides.location_id
        WHERE user_permission_overrides.user_id = $1
          AND user_permission_overrides.removed_at IS NULL

        ORDER BY "source", "key"
      `,
      [userId],
    );

    return result.rows;
  }
}
