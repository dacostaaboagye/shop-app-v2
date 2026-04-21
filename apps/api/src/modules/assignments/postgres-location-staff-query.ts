import { invoices, locations, roles, userRoles, users } from "@shop/database";
import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { getCurrentAssignmentCountsForLocation } from "../inventory-ownership/ownership-latest-event-query.js";

export type LocationStaffRow = {
  activeAssignmentCount: number;
  assignedAt: Date;
  email: string;
  firstName: string;
  lastName: string;
  lastSaleAt: Date | string | null;
  locationName: string;
  netSalesAmount: string;
  returnsCount: number;
  returnsTotalAmount: string;
  roleName: string;
  roleSlug: "manager" | "worker";
  salesCount: number;
  salesTotalAmount: string;
  status: "active" | "deactivated" | "suspended";
  userId: string;
  userSlug: string;
};

const STAFF_ROLE_SLUGS = ["manager", "worker"] as const;

export async function getLocationStaffRows(
  db: ApiDatabase,
  locationId: string,
): Promise<LocationStaffRow[]> {
  const assignmentCounts = getCurrentAssignmentCountsForLocation(
    db,
    locationId,
  );
  const salesPerformance = getWorkerSalesPerformance(db, locationId);

  const rows = await db
    .select({
      activeAssignmentCount: assignmentCounts.activeAssignmentCount,
      assignedAt: userRoles.assignedAt,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      lastSaleAt: salesPerformance.lastSaleAt,
      locationName: locations.name,
      netSalesAmount: salesPerformance.netSalesAmount,
      returnsCount: salesPerformance.returnsCount,
      returnsTotalAmount: salesPerformance.returnsTotalAmount,
      roleName: roles.name,
      roleSlug: roles.slug,
      salesCount: salesPerformance.salesCount,
      salesTotalAmount: salesPerformance.salesTotalAmount,
      status: users.status,
      userId: userRoles.userId,
      userSlug: users.slug,
    })
    .from(userRoles)
    .innerJoin(users, eq(users.id, userRoles.userId))
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .innerJoin(locations, eq(locations.id, userRoles.locationId))
    .leftJoin(assignmentCounts, eq(assignmentCounts.workerId, userRoles.userId))
    .leftJoin(salesPerformance, eq(salesPerformance.workerId, userRoles.userId))
    .where(
      and(
        eq(userRoles.locationId, locationId),
        isNull(userRoles.revokedAt),
        inArray(roles.slug, STAFF_ROLE_SLUGS),
      ),
    )
    .orderBy(asc(roles.slug), asc(users.firstName), asc(users.lastName));

  return rows.map((row) => ({
    activeAssignmentCount: Number(row.activeAssignmentCount ?? 0),
    assignedAt: row.assignedAt,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    lastSaleAt: row.lastSaleAt,
    locationName: row.locationName,
    netSalesAmount: row.netSalesAmount ?? "0.00",
    returnsCount: Number(row.returnsCount ?? 0),
    returnsTotalAmount: row.returnsTotalAmount ?? "0.00",
    roleName: row.roleName,
    roleSlug: row.roleSlug as "manager" | "worker",
    salesCount: Number(row.salesCount ?? 0),
    salesTotalAmount: row.salesTotalAmount ?? "0.00",
    status: row.status,
    userId: row.userId,
    userSlug: row.userSlug,
  }));
}

function getWorkerSalesPerformance(db: ApiDatabase, locationId: string) {
  return db
    .select({
      lastSaleAt: sql<Date | null>`
        max(${invoices.confirmedAt}) filter (where ${invoices.type} = 'pos')
      `.as("last_sale_at"),
      netSalesAmount: sql<string>`
        (
          coalesce(sum(${invoices.totalAmount}) filter (where ${invoices.type} = 'pos'), 0)
          - coalesce(sum(${invoices.totalAmount}) filter (where ${invoices.type} = 'credit_note'), 0)
        )::numeric(12, 2)
      `.as("net_sales_amount"),
      returnsCount: sql<number>`
        count(*) filter (where ${invoices.type} = 'credit_note')::int
      `.as("returns_count"),
      returnsTotalAmount: sql<string>`
        coalesce(sum(${invoices.totalAmount}) filter (where ${invoices.type} = 'credit_note'), 0)::numeric(12, 2)
      `.as("returns_total_amount"),
      salesCount: sql<number>`
        count(*) filter (where ${invoices.type} = 'pos')::int
      `.as("sales_count"),
      salesTotalAmount: sql<string>`
        coalesce(sum(${invoices.totalAmount}) filter (where ${invoices.type} = 'pos'), 0)::numeric(12, 2)
      `.as("sales_total_amount"),
      workerId: invoices.attributedWorkerId,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.locationId, locationId),
        eq(invoices.status, "confirmed"),
        isNotNull(invoices.attributedWorkerId),
        inArray(invoices.type, ["pos", "credit_note"]),
      ),
    )
    .groupBy(invoices.attributedWorkerId)
    .as("worker_sales_performance");
}
