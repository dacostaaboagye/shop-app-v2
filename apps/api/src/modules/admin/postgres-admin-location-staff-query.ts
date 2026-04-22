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
      managerId: locations.managerId,
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

  const locationManager = location.managerId
    ? await findLocationManager(db, location.managerId)
    : null;
  const primaryImageUrls = await listPrimaryImageUrls(db, "user", [
    ...rows.map((row) => row.userSlug),
    ...(locationManager ? [locationManager.userSlug] : []),
  ]);

  const assignedItems = rows.map((row) => ({
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

  const items = mergeLocationManagerStaff({
    assignedAt: toIsoTimestamp(location.createdAt),
    items: assignedItems,
    manager: locationManager
      ? {
          ...locationManager,
          primaryImageUrl:
            primaryImageUrls.get(locationManager.userSlug) ?? null,
        }
      : null,
  });

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

async function findLocationManager(db: ApiDatabase, managerId: string) {
  const [manager] = await db
    .select({
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      status: users.status,
      userSlug: users.slug,
    })
    .from(users)
    .where(eq(users.id, managerId))
    .limit(1);

  return manager ?? null;
}

export function mergeLocationManagerStaff(input: {
  assignedAt: string;
  items: AdminLocationStaffSummary[];
  manager: {
    email: string;
    firstName: string;
    lastName: string;
    primaryImageUrl: string | null;
    status: AdminLocationStaffSummary["status"];
    userSlug: string;
  } | null;
}): AdminLocationStaffSummary[] {
  if (!input.manager) return input.items;

  const hasManagerRoleAssignment = input.items.some(
    (item) => item.roleSlug === "manager",
  );

  if (hasManagerRoleAssignment) return input.items;

  return [
    {
      activeAssignmentCount: 0,
      assignedAt: input.assignedAt,
      email: input.manager.email,
      firstName: input.manager.firstName,
      lastName: input.manager.lastName,
      primaryImageUrl: input.manager.primaryImageUrl,
      roleName: "Manager",
      roleSlug: "manager",
      status: input.manager.status,
      userSlug: input.manager.userSlug,
    },
    ...input.items,
  ];
}
