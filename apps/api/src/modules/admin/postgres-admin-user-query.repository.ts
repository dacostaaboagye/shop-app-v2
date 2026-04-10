import type {
  AdminAssignedLocation,
  AdminRoleOption,
  AdminUserListQuery,
  AdminUserSummary,
} from "@shop/contracts";
import type { Pool } from "pg";
import type { AdminUserQueryRepository } from "./admin-user-query.service.js";

type AdminUserRow = Omit<AdminUserSummary, "createdAt" | "lastLoginAt"> & {
  createdAt: Date;
  lastLoginAt: Date | null;
};
type RoleRow = AdminRoleOption;

export class PostgresAdminUserQueryRepository
  implements AdminUserQueryRepository
{
  constructor(private readonly pool: Pick<Pool, "query">) {}

  async listUsers(input: AdminUserListQuery) {
    const values = buildUserFilterValues(input);
    const offset = (input.page - 1) * input.pageSize;
    const availableRolesResult = await this.pool.query<RoleRow>(
      `
        SELECT slug, name
        FROM roles
        ORDER BY name ASC, slug ASC
      `,
    );
    const countResult = await this.pool.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM users
        WHERE ($1::boolean = false OR CONCAT_WS(' ', first_name, last_name, email) ILIKE $2)
          AND ($3::boolean = false OR status = $4)
          AND (
            $5::boolean = false
            OR EXISTS (
              SELECT 1
              FROM user_roles
              JOIN roles ON roles.id = user_roles.role_id
              WHERE user_roles.user_id = users.id
                AND user_roles.revoked_at IS NULL
                AND roles.slug = $6
            )
          )
      `,
      values,
    );
    const result = await this.pool.query<AdminUserRow>(
      `
        SELECT
          users.slug,
          users.first_name AS "firstName",
          users.last_name AS "lastName",
          users.email,
          users.status,
          users.preferred_portal AS "preferredPortal",
          users.last_login_at AS "lastLoginAt",
          users.requires_password_change AS "requiresPasswordChange",
          users.created_at AS "createdAt",
          COALESCE(
            JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('slug', roles.slug, 'name', roles.name))
              FILTER (WHERE user_roles.revoked_at IS NULL AND roles.slug IS NOT NULL),
            '[]'::json
          ) AS roles,
          COALESCE(
            JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('name', locations.name, 'slug', locations.slug))
              FILTER (WHERE user_roles.revoked_at IS NULL AND locations.slug IS NOT NULL),
            '[]'::json
          ) AS "assignedLocations"
        FROM users
        LEFT JOIN user_roles ON user_roles.user_id = users.id
        LEFT JOIN roles ON roles.id = user_roles.role_id
        LEFT JOIN locations ON locations.id = user_roles.location_id
        WHERE ($1::boolean = false OR CONCAT_WS(' ', users.first_name, users.last_name, users.email) ILIKE $2)
          AND ($3::boolean = false OR users.status = $4)
          AND (
            $5::boolean = false
            OR EXISTS (
              SELECT 1
              FROM user_roles filtered_roles
              JOIN roles filtered_role_defs ON filtered_role_defs.id = filtered_roles.role_id
              WHERE filtered_roles.user_id = users.id
                AND filtered_roles.revoked_at IS NULL
                AND filtered_role_defs.slug = $6
            )
          )
        GROUP BY
          users.id,
          users.slug,
          users.first_name,
          users.last_name,
          users.email,
          users.status,
          users.preferred_portal,
          users.last_login_at,
          users.requires_password_change,
          users.created_at
        ORDER BY ${getUserSortClause(input)}
        LIMIT $7 OFFSET $8
      `,
      [...values, input.pageSize, offset],
    );

    return {
      availableRoles: availableRolesResult.rows,
      items: result.rows.map((row) => ({
        ...row,
        assignedLocations: row.assignedLocations as AdminAssignedLocation[],
        roles: row.roles as AdminRoleOption[],
        createdAt: row.createdAt.toISOString(),
        lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
      })),
      totalCount: Number.parseInt(countResult.rows[0]?.count ?? "0", 10),
    };
  }
}

function buildUserFilterValues(input: AdminUserListQuery) {
  const query = input.q.trim();
  const role = input.role.trim();

  return [
    query.length > 0,
    `%${query}%`,
    input.status !== "all",
    input.status === "all" ? null : input.status,
    role.length > 0,
    role.length > 0 ? role : null,
  ];
}

function getUserSortClause(input: AdminUserListQuery) {
  const direction = input.dir === "desc" ? "DESC" : "ASC";

  switch (input.sort) {
    case "createdAt":
      return `users.created_at ${direction}, users.id ASC`;
    case "status":
      return `users.status ${direction}, users.last_name ASC, users.first_name ASC`;
    default:
      return `users.first_name ${direction}, users.last_name ${direction}, users.id ASC`;
  }
}
