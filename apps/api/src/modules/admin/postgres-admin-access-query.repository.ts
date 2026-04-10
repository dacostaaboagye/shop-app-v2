import type {
  AdminAuditEntry,
  AdminAuditListQuery,
  AdminAuditListResponse,
  AdminPermissionListQuery,
  AdminPermissionListResponse,
  AdminPermissionSummary,
  AdminRoleDetail,
  AdminRoleListQuery,
  AdminRoleListResponse,
  AdminRoleSummary,
} from "@shop/contracts";
import type { Pool } from "pg";
import type { AdminAccessQueryRepository } from "./admin-access-query.service.js";

type RoleRow = AdminRoleSummary;
type PermissionRow = AdminPermissionSummary;
type AuditRow = Omit<AdminAuditEntry, "createdAt"> & { createdAt: Date };

export class PostgresAdminAccessQueryRepository
  implements AdminAccessQueryRepository
{
  constructor(private readonly pool: Pick<Pool, "query">) {}

  async getRole(slug: string): Promise<AdminRoleDetail | null> {
    const roleResult = await this.pool.query<RoleRow>(
      `
        SELECT
          roles.slug,
          roles.name,
          roles.description,
          roles.is_system AS "isSystem",
          COUNT(DISTINCT role_permissions.permission_id)::int AS "permissionCount",
          COUNT(DISTINCT user_roles.user_id)::int AS "assignedUserCount"
        FROM roles
        LEFT JOIN role_permissions ON role_permissions.role_id = roles.id
        LEFT JOIN user_roles ON user_roles.role_id = roles.id AND user_roles.revoked_at IS NULL
        WHERE roles.slug = $1
        GROUP BY roles.id
      `,
      [slug],
    );
    const role = roleResult.rows[0];

    if (!role) {
      return null;
    }

    const permissionsResult = await this.pool.query<
      PermissionRow & { granted: boolean }
    >(
      `
        SELECT
          permissions.key,
          permissions.description,
          COUNT(DISTINCT role_permissions.role_id)::int AS "assignedRoleCount",
          EXISTS (
            SELECT 1
            FROM role_permissions role_permissions_for_role
            JOIN roles roles_for_permission
              ON roles_for_permission.id = role_permissions_for_role.role_id
            WHERE roles_for_permission.slug = $1
              AND role_permissions_for_role.permission_id = permissions.id
          ) AS granted
        FROM permissions
        LEFT JOIN role_permissions ON role_permissions.permission_id = permissions.id
        GROUP BY permissions.id
        ORDER BY permissions.key ASC
      `,
      [slug],
    );

    return { ...role, permissions: permissionsResult.rows };
  }

  async listAudit(input: AdminAuditListQuery): Promise<AdminAuditListResponse> {
    const offset = (input.page - 1) * input.pageSize;
    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM permission_audit_log`,
    );
    const result = await this.pool.query<AuditRow>(
      `
        SELECT
          permission_audit_log.action,
          permission_audit_log.permission_key AS "permissionKey",
          permission_audit_log.role_slug AS "roleSlug",
          permission_audit_log.override_effect AS "overrideEffect",
          permission_audit_log.reason,
          permission_audit_log.created_at AS "createdAt",
          NULLIF(TRIM(CONCAT_WS(' ', actors.first_name, actors.last_name)), '') AS "actorName",
          NULLIF(TRIM(CONCAT_WS(' ', targets.first_name, targets.last_name)), '') AS "targetUserName",
          locations.name AS "locationName"
        FROM permission_audit_log
        LEFT JOIN users actors ON actors.id = permission_audit_log.actor_id
        LEFT JOIN users targets ON targets.id = permission_audit_log.target_user_id
        LEFT JOIN locations ON locations.id = permission_audit_log.location_id
        ORDER BY permission_audit_log.created_at DESC, permission_audit_log.id DESC
        LIMIT $1 OFFSET $2
      `,
      [input.pageSize, offset],
    );

    return {
      items: result.rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      page: input.page,
      pageSize: input.pageSize,
      totalCount: Number.parseInt(countResult.rows[0]?.count ?? "0", 10),
    };
  }

  async listPermissions(
    input: AdminPermissionListQuery,
  ): Promise<AdminPermissionListResponse> {
    const offset = (input.page - 1) * input.pageSize;
    const query = input.q.trim();
    const filters = [query.length > 0, `%${query}%`];
    const countResult = await this.pool.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM permissions
        WHERE ($1::boolean = false OR CONCAT_WS(' ', key, description) ILIKE $2)
      `,
      filters,
    );
    const result = await this.pool.query<PermissionRow>(
      `
        SELECT
          permissions.key,
          permissions.description,
          COUNT(DISTINCT role_permissions.role_id)::int AS "assignedRoleCount"
        FROM permissions
        LEFT JOIN role_permissions ON role_permissions.permission_id = permissions.id
        WHERE ($1::boolean = false OR CONCAT_WS(' ', permissions.key, permissions.description) ILIKE $2)
        GROUP BY permissions.id
        ORDER BY permissions.key ASC
        LIMIT $3 OFFSET $4
      `,
      [...filters, input.pageSize, offset],
    );

    return buildPagedResponse(result.rows, input, countResult.rows[0]?.count);
  }

  async listRoles(input: AdminRoleListQuery): Promise<AdminRoleListResponse> {
    const offset = (input.page - 1) * input.pageSize;
    const query = input.q.trim();
    const filters = [query.length > 0, `%${query}%`];
    const countResult = await this.pool.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM roles
        WHERE ($1::boolean = false OR CONCAT_WS(' ', slug, name, description) ILIKE $2)
      `,
      filters,
    );
    const result = await this.pool.query<RoleRow>(
      `
        SELECT
          roles.slug,
          roles.name,
          roles.description,
          roles.is_system AS "isSystem",
          COUNT(DISTINCT role_permissions.permission_id)::int AS "permissionCount",
          COUNT(DISTINCT user_roles.user_id)::int AS "assignedUserCount"
        FROM roles
        LEFT JOIN role_permissions ON role_permissions.role_id = roles.id
        LEFT JOIN user_roles ON user_roles.role_id = roles.id AND user_roles.revoked_at IS NULL
        WHERE ($1::boolean = false OR CONCAT_WS(' ', roles.slug, roles.name, roles.description) ILIKE $2)
        GROUP BY roles.id
        ORDER BY roles.is_system DESC, roles.name ASC, roles.slug ASC
        LIMIT $3 OFFSET $4
      `,
      [...filters, input.pageSize, offset],
    );

    return buildPagedResponse(result.rows, input, countResult.rows[0]?.count);
  }
}

function buildPagedResponse<TItem>(
  items: TItem[],
  input: { page: number; pageSize: number },
  totalCount: string | undefined,
) {
  return {
    items,
    page: input.page,
    pageSize: input.pageSize,
    totalCount: Number.parseInt(totalCount ?? "0", 10),
  };
}
