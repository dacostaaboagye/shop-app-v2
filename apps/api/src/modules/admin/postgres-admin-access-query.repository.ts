import type {
  AdminAuditListQuery,
  AdminAuditListResponse,
  AdminPermissionListQuery,
  AdminPermissionListResponse,
  AdminRoleDetail,
  AdminRoleListQuery,
  AdminRoleListResponse,
} from "@shop/contracts";
import {
  locations,
  permissionAuditLog,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from "@shop/database";
import { aliasedTable, and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { AdminAccessQueryRepository } from "./admin-access-query.service.js";

export class PostgresAdminAccessQueryRepository
  implements AdminAccessQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}
  async getRole(slug: string): Promise<AdminRoleDetail | null> {
    const role = await this.db.query.roles.findFirst({
      where: (r, { eq }) => eq(r.slug, slug),
      with: {
        rolePermissions: {
          with: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return null;
    }
    const counts = await this.db
      .select({
        permissionCount: sql<number>`cast(count(distinct ${rolePermissions.permissionId}) as int)`,
        assignedUserCount: sql<number>`cast(count(distinct ${userRoles.userId}) as int)`,
      })
      .from(roles)
      .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .leftJoin(
        userRoles,
        and(
          eq(userRoles.roleId, roles.id),
          sql`${userRoles.revokedAt} IS NULL`,
        ),
      )
      .where(eq(roles.id, role.id))
      .groupBy(roles.id, roles.name, roles.slug)
      .then((rows) => rows[0]);
    const allPermissions = await this.db
      .select({
        key: permissions.key,
        description: permissions.description,
        assignedRoleCount: sql<number>`cast(count(distinct ${rolePermissions.roleId}) as int)`,
        granted: sql<boolean>`EXISTS (
          SELECT 1 FROM ${rolePermissions} 
          WHERE role_id = ${role.id} AND permission_id = ${permissions.id}
        )`,
      })
      .from(permissions)
      .leftJoin(
        rolePermissions,
        eq(rolePermissions.permissionId, permissions.id),
      )
      .groupBy(permissions.id, permissions.key, permissions.description)
      .orderBy(asc(permissions.key));
    return {
      slug: role.slug,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissionCount: counts?.permissionCount ?? 0,
      assignedUserCount: counts?.assignedUserCount ?? 0,
      permissions: allPermissions,
    };
  }

  async listAudit(input: AdminAuditListQuery): Promise<AdminAuditListResponse> {
    const offset = (input.page - 1) * input.pageSize;
    const actors = aliasedTable(users, "actors");
    const targets = aliasedTable(users, "targets");
    const [totalCountResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(permissionAuditLog),
      this.db
        .select({
          action: permissionAuditLog.action,
          permissionKey: permissionAuditLog.permissionKey,
          roleSlug: permissionAuditLog.roleSlug,
          overrideEffect: permissionAuditLog.overrideEffect,
          reason: permissionAuditLog.reason,
          createdAt: permissionAuditLog.createdAt,
          actorName: sql<
            string | null
          >`NULLIF(TRIM(CONCAT_WS(' ', ${actors.firstName}, ${actors.lastName})), '')`,
          targetUserName: sql<
            string | null
          >`NULLIF(TRIM(CONCAT_WS(' ', ${targets.firstName}, ${targets.lastName})), '')`,
          locationName: locations.name,
        })
        .from(permissionAuditLog)
        .leftJoin(actors, eq(actors.id, permissionAuditLog.actorId))
        .leftJoin(targets, eq(targets.id, permissionAuditLog.targetUserId))
        .leftJoin(locations, eq(locations.id, permissionAuditLog.locationId))
        .orderBy(
          desc(permissionAuditLog.createdAt),
          desc(permissionAuditLog.id),
        )
        .limit(input.pageSize)
        .offset(offset),
    ]);
    return {
      items: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      page: input.page,
      pageSize: input.pageSize,
      totalCount: totalCountResult[0]?.count ?? 0,
    };
  }

  async listPermissions(
    input: AdminPermissionListQuery,
  ): Promise<AdminPermissionListResponse> {
    const offset = (input.page - 1) * input.pageSize;
    const pattern = `%${input.q.trim()}%`;
    const hasQuery = input.q.trim().length > 0;
    const [totalCountResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(permissions)
        .where(
          hasQuery
            ? or(
                ilike(permissions.key, pattern),
                ilike(permissions.description, pattern),
              )
            : undefined,
        ),
      this.db
        .select({
          key: permissions.key,
          description: permissions.description,
          assignedRoleCount: sql<number>`cast(count(distinct ${rolePermissions.roleId}) as int)`,
        })
        .from(permissions)
        .leftJoin(
          rolePermissions,
          eq(rolePermissions.permissionId, permissions.id),
        )
        .where(
          hasQuery
            ? or(
                ilike(permissions.key, pattern),
                ilike(permissions.description, pattern),
              )
            : undefined,
        )
        .groupBy(permissions.id, permissions.key, permissions.description)
        .orderBy(asc(permissions.key))
        .limit(input.pageSize)
        .offset(offset),
    ]);
    return {
      items: rows,
      page: input.page,
      pageSize: input.pageSize,
      totalCount: totalCountResult[0]?.count ?? 0,
    };
  }

  async listRoles(input: AdminRoleListQuery): Promise<AdminRoleListResponse> {
    const offset = (input.page - 1) * input.pageSize;
    const pattern = `%${input.q.trim()}%`;
    const hasQuery = input.q.trim().length > 0;
    const [totalCountResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(roles)
        .where(
          hasQuery
            ? or(
                ilike(roles.slug, pattern),
                ilike(roles.name, pattern),
                ilike(roles.description, pattern),
              )
            : undefined,
        ),
      this.db
        .select({
          slug: roles.slug,
          name: roles.name,
          description: roles.description,
          isSystem: roles.isSystem,
          permissionCount: sql<number>`cast(count(distinct ${rolePermissions.permissionId}) as int)`,
          assignedUserCount: sql<number>`cast(count(distinct ${userRoles.userId}) as int)`,
        })
        .from(roles)
        .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
        .leftJoin(
          userRoles,
          and(
            eq(userRoles.roleId, roles.id),
            sql`${userRoles.revokedAt} IS NULL`,
          ),
        )
        .where(
          hasQuery
            ? or(
                ilike(roles.slug, pattern),
                ilike(roles.name, pattern),
                ilike(roles.description, pattern),
              )
            : undefined,
        )
        .groupBy(
          roles.id,
          roles.slug,
          roles.name,
          roles.description,
          roles.isSystem,
        )
        .orderBy(desc(roles.isSystem), asc(roles.name), asc(roles.slug))
        .limit(input.pageSize)
        .offset(offset),
    ]);
    return {
      items: rows,
      page: input.page,
      pageSize: input.pageSize,
      totalCount: totalCountResult[0]?.count ?? 0,
    };
  }
}
