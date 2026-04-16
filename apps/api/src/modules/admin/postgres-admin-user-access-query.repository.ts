import {
  AdminUserAccessActivityEvent,
  AdminUserAccessDetail,
  AuthUserStatus,
  PortalKey,
} from "@shop/contracts";
import {
  catalogMediaAssignments,
  mediaAssets,
  permissions,
  rolePermissions,
  userPermissionOverrides,
  userRoles,
} from "@shop/database";
import { and, eq, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { AdminUserAccessQueryRepository } from "./admin-user-access-query.service.js";
import {
  deriveAvailablePortals,
  mergeAssignedLocations,
  type PermissionAssignmentRow,
  resolveEffectivePermissions,
} from "./postgres-admin-user-access-query.support.js";

export class PostgresAdminUserAccessQueryRepository
  implements AdminUserAccessQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getUserAccessDetail(
    slug: string,
  ): Promise<AdminUserAccessDetail | null> {
    const user = await this.db.query.users.findFirst({
      where: (u, { eq }) => eq(u.slug, slug),
      with: {
        userRoles: {
          where: (ur, { isNull }) => isNull(ur.revokedAt),
          with: {
            role: true,
            location: true,
            assignedBy: true,
          },
        },
        permissionOverrides: {
          where: (po, { isNull }) => isNull(po.removedAt),
          with: {
            permission: true,
            location: true,
            setBy: true,
          },
        },
        authEvents: {
          limit: 12,
          orderBy: (ae, { desc }) => [desc(ae.occurredAt), desc(ae.id)],
        },
      },
    });

    if (!user) {
      return null;
    }

    // Primary Image
    const [image] = await this.db
      .select({ url: mediaAssets.publicUrl })
      .from(catalogMediaAssignments)
      .innerJoin(mediaAssets, eq(mediaAssets.id, catalogMediaAssignments.assetId))
      .where(
        and(
          eq(catalogMediaAssignments.entityType, "user"),
          eq(catalogMediaAssignments.entitySlug, user.slug),
          eq(catalogMediaAssignments.isPrimary, true),
        ),
      )
      .limit(1);

    const permissionAssignments = await this.getPermissionAssignments(user.id);

    const roleAssignments = user.userRoles.map((ur) => ({
      roleSlug: ur.role?.slug ?? "",
      roleName: ur.role?.name ?? "",
      locationSlug: ur.location?.slug ?? null,
      locationName: ur.location?.name ?? null,
      assignedByName: ur.assignedBy
        ? `${ur.assignedBy.firstName} ${ur.assignedBy.lastName}`.trim()
        : null,
      assignedAt: ur.assignedAt,
    }));

    const userOverrides = user.permissionOverrides.map((po) => ({
      permissionKey: po.permission?.key ?? "",
      description: po.permission?.description ?? "",
      effect: po.effect,
      locationSlug: po.location?.slug ?? null,
      locationName: po.location?.name ?? null,
      reason: po.reason,
      setByName: po.setBy
        ? `${po.setBy.firstName} ${po.setBy.lastName}`.trim()
        : null,
      createdAt: po.createdAt,
    }));

    const assignedLocations = mergeAssignedLocations(
      roleAssignments,
      userOverrides,
    );

    return {
      assignedLocations,
      availablePortals: deriveAvailablePortals(roleAssignments) as PortalKey[],
      effectivePermissions: resolveEffectivePermissions(
        permissionAssignments,
        assignedLocations,
      ),
      email: user.email,
      firstName: user.firstName,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      lastName: user.lastName,
      preferredPortal: user.preferredPortal as PortalKey | null,
      primaryImageUrl: image?.url ?? null,
      recentActivity: user.authEvents.map((ae) => ({
        eventType: ae.eventType as AdminUserAccessActivityEvent["eventType"],
        ipAddress: ae.ipAddress,
        userAgent: ae.userAgent,
        occurredAt: ae.occurredAt.toISOString(),
      })),
      requiresPasswordChange: user.requiresPasswordChange,
      roleAssignments: roleAssignments.map((ra) => ({
        ...ra,
        assignedAt: ra.assignedAt.toISOString(),
      })),
      slug: user.slug,
      status: user.status as AuthUserStatus,
      userOverrides: userOverrides.map((uo) => ({
        ...uo,
        createdAt: uo.createdAt.toISOString(),
      })),
    };
  }

  private async getPermissionAssignments(userId: string) {
    const roleBased = this.db
      .select({
        key: permissions.key,
        description: permissions.description,
        locationId: userRoles.locationId,
        locationSlug: sql<string | null>`l.slug`,
        locationName: sql<string | null>`l.name`,
        effect: sql<"allow" | "deny" | null>`NULL`,
        source: sql<"override" | "role">`'role'`,
      })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .leftJoin(sql`locations l`, sql`l.id = ${userRoles.locationId}`)
      .where(and(eq(userRoles.userId, userId), sql`${userRoles.revokedAt} IS NULL`));

    const overrideBased = this.db
      .select({
        key: permissions.key,
        description: permissions.description,
        locationId: userPermissionOverrides.locationId,
        locationSlug: sql<string | null>`l.slug`,
        locationName: sql<string | null>`l.name`,
        effect: userPermissionOverrides.effect,
        source: sql<"override" | "role">`'override'`,
      })
      .from(userPermissionOverrides)
      .innerJoin(
        permissions,
        eq(permissions.id, userPermissionOverrides.permissionId),
      )
      .leftJoin(
        sql`locations l`,
        sql`l.id = ${userPermissionOverrides.locationId}`,
      )
      .where(
        and(
          eq(userPermissionOverrides.userId, userId),
          sql`${userPermissionOverrides.removedAt} IS NULL`,
        ),
      );

    const rows = await roleBased.unionAll(overrideBased);

    return rows as PermissionAssignmentRow[];
  }
}
