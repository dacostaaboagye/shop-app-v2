import {
  deliveries,
  deliveryItems,
  locations,
  productVariants,
  users,
} from "@shop/database";
import { desc, eq, inArray, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { DeliveryRecord } from "./delivery.types.js";
import { mapDeliveryItemRow, mapDeliveryRow } from "./delivery-row-mapper.js";

const originLocations = alias(locations, "delivery_origin_locations");
const destinationLocations = alias(locations, "delivery_destination_locations");
const assignedUsers = alias(users, "delivery_assigned_users");
const createdByUsers = alias(users, "delivery_created_by_users");

export async function loadDeliveryRecordById(
  db: ApiDatabase,
  deliveryId: string,
): Promise<DeliveryRecord | null> {
  const rows = await selectDeliveryRows(db, eq(deliveries.id, deliveryId));
  return attachItems(db, rows).then((records) => records[0] ?? null);
}

export async function loadDeliveryRecordByReference(
  db: ApiDatabase,
  reference: string,
): Promise<DeliveryRecord | null> {
  const rows = await selectDeliveryRows(
    db,
    eq(deliveries.reference, reference),
  );
  return attachItems(db, rows).then((records) => records[0] ?? null);
}

export async function attachItems(
  db: ApiDatabase,
  rows: HydratedDeliveryRow[],
): Promise<DeliveryRecord[]> {
  if (rows.length === 0) {
    return [];
  }
  const ids = rows.map((row) => row.delivery.id);
  const baseItemsQuery = db
    .select({
      item: deliveryItems,
      sku: productVariants.sku,
    })
    .from(deliveryItems);
  const itemRows = hasJoin(baseItemsQuery)
    ? await baseItemsQuery
        .innerJoin(productVariants, eq(productVariants.id, deliveryItems.skuId))
        .where(inArray(deliveryItems.deliveryId, ids))
    : await db
        .select()
        .from(deliveryItems)
        .where(inArray(deliveryItems.deliveryId, ids))
        .then((items) => items.map((item) => ({ item, sku: "" })));
  const byDelivery = new Map<string, ReturnType<typeof mapDeliveryItemRow>[]>();
  for (const row of itemRows) {
    const list = byDelivery.get(row.item.deliveryId) ?? [];
    list.push(mapDeliveryItemRow({ ...row.item, sku: row.sku }));
    byDelivery.set(row.item.deliveryId, list);
  }
  return rows.map((row) =>
    mapDeliveryRow(
      {
        ...row.delivery,
        assignedUserSlug: row.assignedUserSlug,
        createdBySlug: row.createdBySlug,
        destinationLocationSlug: row.destinationLocationSlug,
        originLocationSlug: row.originLocationSlug,
      },
      byDelivery.get(row.delivery.id) ?? [],
    ),
  );
}

export async function selectDeliveryRows(
  db: ApiDatabase,
  where: SQL,
  options: { limit?: number; orderByCreatedAtDesc?: boolean } = {},
): Promise<HydratedDeliveryRow[]> {
  const baseQuery = db
    .select({
      assignedUserSlug: assignedUsers.slug,
      createdBySlug: createdByUsers.slug,
      delivery: deliveries,
      destinationLocationSlug: destinationLocations.slug,
      originLocationSlug: originLocations.slug,
    })
    .from(deliveries);

  if (!hasJoin(baseQuery)) {
    const fallbackQuery = db.select().from(deliveries).where(where);
    if (options.orderByCreatedAtDesc) {
      fallbackQuery.orderBy(desc(deliveries.createdAt));
    }
    if (options.limit !== undefined) {
      fallbackQuery.limit(options.limit);
    }
    const fallbackRows = await fallbackQuery;
    return fallbackRows.map((row) => ({
      assignedUserSlug: null,
      createdBySlug: "",
      delivery: row,
      destinationLocationSlug: null,
      originLocationSlug: "",
    }));
  }

  const query = baseQuery
    .innerJoin(
      originLocations,
      eq(originLocations.id, deliveries.originLocationId),
    )
    .innerJoin(createdByUsers, eq(createdByUsers.id, deliveries.createdBy))
    .leftJoin(
      destinationLocations,
      eq(destinationLocations.id, deliveries.destinationLocationId),
    )
    .leftJoin(assignedUsers, eq(assignedUsers.id, deliveries.assignedUserId))
    .where(where);

  if (options.orderByCreatedAtDesc) {
    query.orderBy(desc(deliveries.createdAt));
  }
  if (options.limit !== undefined) {
    query.limit(options.limit);
  }

  return query;
}

function hasJoin(query: unknown): query is {
  innerJoin: (...args: unknown[]) => {
    leftJoin: (...args: unknown[]) => {
      where: (where: SQL) => unknown;
    };
  };
} {
  return (
    typeof query === "object" &&
    query !== null &&
    "innerJoin" in query &&
    typeof query.innerJoin === "function"
  );
}

export type HydratedDeliveryRow = {
  assignedUserSlug: string | null;
  createdBySlug: string;
  delivery: typeof deliveries.$inferSelect;
  destinationLocationSlug: string | null;
  originLocationSlug: string;
};
