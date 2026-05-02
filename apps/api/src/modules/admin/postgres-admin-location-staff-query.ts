import type { AdminLocationStaffSummary } from "@shop/contracts";
import { locations, roles, userRoles, users } from "@shop/database";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { listPrimaryImageUrls } from "../catalog/catalog-primary-image.loader.js";
import { getCurrentAssignmentCountsForLocation } from "../inventory-ownership/ownership-latest-event-query.js";

export async function listAdminLocationStaff(
  db: ApiDatabase,
  locationSlug: string,
): Promise<{
  items: AdminLocationStaffSummary[];
  locationName: string | null;
  locationSlug: string;
}> {
  const [location] = await db
    .select({
      createdAt: locations.createdAt,
      id: locations.id,
      name: locations.name,
      slug: locations.slug,
    })
    .from(locations)
    .where(eq(locations.slug, locationSlug))
    .limit(1);

  if (!location) {
    return { items: [], locationName: null, locationSlug };
  }

  const assignmentCounts = getCurrentAssignmentCountsForLocation(
    db,
    location.id,
  );

  const rows = await db
    .select({
      activeAssignmentCount: assignmentCounts.activeAssignmentCount,
      assignedAt: userRoles.assignedAt,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      roleName: roles.name,
      roleSlug: roles.slug,
      status: users.status,
      userSlug: users.slug,
    })
    .from(userRoles)
    .innerJoin(users, eq(users.id, userRoles.userId))
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .leftJoin(assignmentCounts, eq(assignmentCounts.workerId, userRoles.userId))
    .where(
      and(
        eq(userRoles.locationId, location.id),
        isNull(userRoles.revokedAt),
        inArray(roles.slug, STAFF_ROLE_SLUGS),
      ),
    )
    .orderBy(asc(roles.slug), asc(users.firstName), asc(users.lastName));

  const primaryImageUrls = await listPrimaryImageUrls(
    db,
    "user",
    rows.map((row) => row.userSlug),
  );

  const items: AdminLocationStaffSummary[] = rows.map((row) => ({
    activeAssignmentCount: Number(row.activeAssignmentCount ?? 0),
    assignedAt: toIsoTimestamp(row.assignedAt),
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    primaryImageUrl: primaryImageUrls.get(row.userSlug) ?? null,
    roleName: row.roleName,
    roleSlug: row.roleSlug as "manager" | "worker",
    status: row.status,
    userSlug: row.userSlug,
  }));

  return {
    items,
    locationName: location.name,
    locationSlug: location.slug,
  };
}

const STAFF_ROLE_SLUGS = ["manager", "worker"] as const;

function toIsoTimestamp(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
