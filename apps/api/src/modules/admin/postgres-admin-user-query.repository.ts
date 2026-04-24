import type {
  AdminAssignedLocation,
  AdminRoleOption,
  AdminStaffListQuery,
  AdminUserListQuery,
  AdminUserSummary,
  AuthUserStatus,
  PortalKey,
} from "@shop/contracts";
import {
  catalogMediaAssignments,
  locations,
  mediaAssets,
  roles,
  userRoles,
  users,
} from "@shop/database";
import type { SQL } from "drizzle-orm";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { AdminUserQueryRepository } from "./admin-user-query.service.js";

const STAFF_ROLE_SLUGS = ["manager", "worker"] as const;

export class PostgresAdminUserQueryRepository
  implements AdminUserQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async listUsers(input: AdminUserListQuery) {
    return this.listUsersWithRoleScope(input, {
      availableRoles: "all",
      roleFilter: input.role ? eq(roles.slug, input.role) : undefined,
    });
  }

  async listStaff(input: AdminStaffListQuery) {
    const roleFilter =
      input.role === "all"
        ? inArray(roles.slug, STAFF_ROLE_SLUGS)
        : eq(roles.slug, input.role);
    const result = await this.listUsersWithRoleScope(input, {
      availableRoles: "staff",
      roleFilter,
    });

    return {
      items: result.items,
      totalCount: result.totalCount,
    };
  }

  private async listUsersWithRoleScope(
    input: AdminUserListQuery | AdminStaffListQuery,
    options: { availableRoles: "all" | "staff"; roleFilter?: SQL | undefined },
  ) {
    const { page, pageSize, q, role, locationSlug, status, sort, dir } = input;
    const offset = (page - 1) * pageSize;
    const pattern = `%${q.trim()}%`;
    const hasQuery = q.trim().length > 0;
    const userFilter = and(
      hasQuery
        ? or(
            ilike(users.firstName, pattern),
            ilike(users.lastName, pattern),
            ilike(users.email, pattern),
          )
        : undefined,
      status !== "all" ? eq(users.status, status as AuthUserStatus) : undefined,
      role || locationSlug ? isNull(userRoles.revokedAt) : undefined,
      options.roleFilter,
      locationSlug ? eq(locations.slug, locationSlug) : undefined,
    );
    const availableRoleFilter =
      options.availableRoles === "staff"
        ? inArray(roles.slug, STAFF_ROLE_SLUGS)
        : undefined;
    const availableRolesQuery = availableRoleFilter
      ? this.db
          .select({ slug: roles.slug, name: roles.name })
          .from(roles)
          .where(availableRoleFilter)
          .orderBy(asc(roles.name))
      : this.db
          .select({ slug: roles.slug, name: roles.name })
          .from(roles)
          .orderBy(asc(roles.name));

    const [availableRoles, totalCountResult, pageUsers] = await Promise.all([
      // 1. Available roles
      availableRolesQuery,

      // 2. Total count with filters
      this.db
        .select({
          count: sql<number>`cast(count(distinct ${users.id}) as int)`,
        })
        .from(users)
        .leftJoin(userRoles, eq(userRoles.userId, users.id))
        .leftJoin(roles, eq(roles.id, userRoles.roleId))
        .leftJoin(locations, eq(locations.id, userRoles.locationId))
        .where(userFilter),

      this.db
        .selectDistinct({
          createdAt: users.createdAt,
          firstName: users.firstName,
          id: users.id,
          status: users.status,
        })
        .from(users)
        .leftJoin(userRoles, eq(userRoles.userId, users.id))
        .leftJoin(roles, eq(roles.id, userRoles.roleId))
        .leftJoin(locations, eq(locations.id, userRoles.locationId))
        .where(userFilter)
        .orderBy(getUserSortExpression(sort, dir))
        .limit(pageSize)
        .offset(offset),
    ]);

    const userRows =
      pageUsers.length > 0
        ? await this.db.query.users.findMany({
            orderBy: (u, { asc, desc }) => [
              sort === "createdAt"
                ? dir === "desc"
                  ? desc(u.createdAt)
                  : asc(u.createdAt)
                : dir === "desc"
                  ? desc(u.firstName)
                  : asc(u.firstName),
            ],
            where: (u, { inArray }) =>
              inArray(
                u.id,
                pageUsers.map((user) => user.id),
              ),
            with: {
              userRoles: {
                where: (ur, { isNull }) => isNull(ur.revokedAt),
                with: {
                  role: true,
                  location: true,
                },
              },
            },
          })
        : [];

    // Fetch primary images separately for the selected users
    const userSlugs = userRows.map((u) => u.slug);
    const images =
      userSlugs.length > 0
        ? await this.db
            .select({
              userSlug: catalogMediaAssignments.entitySlug,
              url: mediaAssets.publicUrl,
            })
            .from(catalogMediaAssignments)
            .innerJoin(
              mediaAssets,
              eq(mediaAssets.id, catalogMediaAssignments.assetId),
            )
            .where(
              and(
                eq(catalogMediaAssignments.entityType, "user"),
                inArray(catalogMediaAssignments.entitySlug, userSlugs),
                eq(catalogMediaAssignments.isPrimary, true),
              ),
            )
        : [];

    const imageMap = new Map(images.map((img) => [img.userSlug, img.url]));

    return {
      availableRoles,
      totalCount: totalCountResult[0]?.count ?? 0,
      items: userRows.map((user): AdminUserSummary => {
        const assignedLocations: AdminAssignedLocation[] = [];
        const userRoles: AdminRoleOption[] = [];

        for (const ur of user.userRoles) {
          if (ur.role)
            userRoles.push({ slug: ur.role.slug, name: ur.role.name });
          if (ur.location)
            assignedLocations.push({
              slug: ur.location.slug,
              name: ur.location.name,
            });
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

function getUserSortExpression(
  sort: AdminUserListQuery["sort"],
  dir: AdminUserListQuery["dir"],
) {
  if (sort === "createdAt") {
    return dir === "desc" ? desc(users.createdAt) : asc(users.createdAt);
  }

  if (sort === "status") {
    return dir === "desc" ? desc(users.status) : asc(users.status);
  }

  return dir === "desc" ? desc(users.firstName) : asc(users.firstName);
}
