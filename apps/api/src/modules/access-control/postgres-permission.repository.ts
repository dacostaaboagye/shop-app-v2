import type { Pool } from "pg";
import type { PermissionResolutionRepository } from "./permission-resolution.service.js";

type PermissionAssignmentRow = {
  effect: "allow" | "deny" | null;
  key: string;
  locationId: string | null;
  source: "override" | "role";
};

export class PostgresPermissionRepository
  implements PermissionResolutionRepository
{
  constructor(private readonly pool: Pool) {}

  async getPermissionAssignments(
    userId: string,
  ): Promise<PermissionAssignmentRow[]> {
    const result = await this.pool.query<PermissionAssignmentRow>(
      `
        SELECT
          permissions.key AS "key",
          user_roles.location_id AS "locationId",
          NULL::permission_override_effect AS "effect",
          'role'::text AS "source"
        FROM user_roles
        INNER JOIN role_permissions
          ON role_permissions.role_id = user_roles.role_id
        INNER JOIN permissions
          ON permissions.id = role_permissions.permission_id
        WHERE user_roles.user_id = $1
          AND user_roles.revoked_at IS NULL

        UNION ALL

        SELECT
          permissions.key AS "key",
          user_permission_overrides.location_id AS "locationId",
          user_permission_overrides.effect AS "effect",
          'override'::text AS "source"
        FROM user_permission_overrides
        INNER JOIN permissions
          ON permissions.id = user_permission_overrides.permission_id
        WHERE user_permission_overrides.user_id = $1
          AND user_permission_overrides.removed_at IS NULL

        ORDER BY "source", "key"
      `,
      [userId],
    );

    return result.rows.map((row) => ({
      effect: row.effect,
      key: row.key,
      locationId: row.locationId,
      source: row.source,
    }));
  }
}
