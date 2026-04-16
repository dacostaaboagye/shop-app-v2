import {
  AdminAssignedLocation,
  AdminRoleOption,
  AdminUserListQuery,
  AdminUserSummary,
  AuthUserStatus,
  PortalKey,
} from "@shop/contracts";
import {
  catalogMediaAssignments,
  mediaAssets,
  roles,
  users,
} from "@shop/database";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { AdminUserQueryRepository } from "./admin-user-query.service.js";

export class PostgresAdminUserQueryRepository
  implements AdminUserQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async listUsers(input: AdminUserListQuery) {
    const { page, pageSize, q, role, locationSlug, status, sort, dir } = input;
    const offset = (page - 1) * pageSize;
    const pattern = `%${q.trim()}%`;
    const hasQuery = q.trim().length > 0;

    const [availableRoles, totalCountResult, userRows] = await Promise.all([
      // 1. Available roles
      this.db.select({ slug: roles.slug, name: roles.name }).from(roles).orderBy(asc(roles.name)),

      // 2. Total count with filters
      this.db
        .select({ count: sql<number>`cast(count(distinct ${users.id}) as int)` })
        .from(users)
        .leftJoin(sql`user_roles`, sql`user_roles.user_id = users.id`)
        .leftJoin(roles, eq(roles.id, sql`user_roles.role_id`))
        .leftJoin(sql`locations`, sql`locations.id = user_roles.location_id`)
        .where(
          and(
            hasQuery ? or(ilike(users.firstName, pattern), ilike(users.lastName, pattern), ilike(users.email, pattern)) : undefined,
            status !== "all" ? eq(users.status, status as AuthUserStatus) : undefined,
            role ? eq(roles.slug, role) : undefined,
            locationSlug ? eq(sql`locations.slug`, locationSlug) : undefined,
          )
        ),

      // 3. User details with relations
      this.db.query.users.findMany({
        where: (u, { and, or, ilike, eq }) =>
          and(
            hasQuery ? or(ilike(u.firstName, pattern), ilike(u.lastName, pattern), ilike(u.email, pattern)) : undefined,
            status !== "all" ? eq(u.status, status as AuthUserStatus) : undefined,
          ),
        with: {
          userRoles: {
            where: (ur, { isNull }) => isNull(ur.revokedAt),
            with: {
              role: true,
              location: true,
            },
          },
          // Profile Image
          // (Need to handle media assignments separately or via another join if not in relations yet)
        },
        orderBy: (u, { asc, desc }) => [
          sort === "createdAt" ? (dir === "desc" ? desc(u.createdAt) : asc(u.createdAt)) : (dir === "desc" ? desc(u.firstName) : asc(u.firstName))
        ],
        limit: pageSize,
        offset: offset,
      }),
    ]);

    // Fetch primary images separately for the selected users
    const userSlugs = userRows.map(u => u.slug);
    const images = userSlugs.length > 0 
      ? await this.db
          .select({
            userSlug: catalogMediaAssignments.entitySlug,
            url: mediaAssets.publicUrl,
          })
          .from(catalogMediaAssignments)
          .innerJoin(mediaAssets, eq(mediaAssets.id, catalogMediaAssignments.assetId))
          .where(
            and(
              eq(catalogMediaAssignments.entityType, "user"),
              sql`${catalogMediaAssignments.entitySlug} IN ${userSlugs}`,
              eq(catalogMediaAssignments.isPrimary, true)
            )
          )
      : [];

    const imageMap = new Map(images.map(img => [img.userSlug, img.url]));

    return {
      availableRoles,
      totalCount: totalCountResult[0]?.count ?? 0,
      items: userRows.map((user): AdminUserSummary => {
        const assignedLocations: AdminAssignedLocation[] = [];
        const userRoles: AdminRoleOption[] = [];

        for (const ur of user.userRoles) {
          if (ur.role) userRoles.push({ slug: ur.role.slug, name: ur.role.name });
          if (ur.location) assignedLocations.push({ slug: ur.location.slug, name: ur.location.name });
        }

        return {
          slug: user.slug,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          status: user.status,
          preferredPortal: user.preferredPortal as PortalKey | null,
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
          requiresPasswordChange: user.requiresPasswordChange,
          createdAt: user.createdAt.toISOString(),
          primaryImageUrl: imageMap.get(user.slug) ?? null,
          roles: userRoles,
          assignedLocations,
        };
      }),
    };
  }
}
