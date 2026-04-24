import { stockOwnershipEvents } from "@shop/database";
import { count, desc, eq, inArray } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export const ACTIVE_OWNERSHIP_EVENT_TYPES = [
  "assigned",
  "reassigned",
  "handover_in",
] as const;

export function getLatestOwnershipEventsForLocation(
  db: ApiDatabase,
  locationId: string,
) {
  return db
    .selectDistinctOn(
      [stockOwnershipEvents.skuId, stockOwnershipEvents.locationId],
      {
        createdAt: stockOwnershipEvents.createdAt,
        effectiveFrom: stockOwnershipEvents.effectiveFrom,
        eventType: stockOwnershipEvents.eventType,
        id: stockOwnershipEvents.id,
        locationId: stockOwnershipEvents.locationId,
        quantity: stockOwnershipEvents.quantity,
        skuId: stockOwnershipEvents.skuId,
        workerId: stockOwnershipEvents.workerId,
      },
    )
    .from(stockOwnershipEvents)
    .where(eq(stockOwnershipEvents.locationId, locationId))
    .orderBy(
      stockOwnershipEvents.skuId,
      stockOwnershipEvents.locationId,
      desc(stockOwnershipEvents.effectiveFrom),
      desc(stockOwnershipEvents.createdAt),
      desc(stockOwnershipEvents.id),
    )
    .as("latest_events");
}

export function getCurrentAssignmentCountsForLocation(
  db: ApiDatabase,
  locationId: string,
) {
  const latestEvents = getLatestOwnershipEventsForLocation(db, locationId);

  return db
    .select({
      activeAssignmentCount: count().as("active_assignment_count"),
      workerId: latestEvents.workerId,
    })
    .from(latestEvents)
    .where(inArray(latestEvents.eventType, ACTIVE_OWNERSHIP_EVENT_TYPES))
    .groupBy(latestEvents.workerId)
    .as("current_assignment_counts");
}
