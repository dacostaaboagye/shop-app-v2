import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  deliveries,
  deliveryItems,
  deliverySourceTypeEnum,
  deliveryStatusEnum,
} from "./deliveries.js";

assert.equal(getTableName(deliveries), "deliveries");
assert.equal(getTableName(deliveryItems), "delivery_items");

assert.equal(deliveries.id.name, "id");
assert.equal(deliveries.reference.name, "reference");
assert.equal(deliveries.reference.notNull, true);
assert.equal(deliveries.sourceType.name, "source_type");
assert.equal(deliveries.sourceReference.name, "source_reference");
assert.equal(deliveries.originLocationId.name, "origin_location_id");
assert.equal(deliveries.destinationLocationId.name, "destination_location_id");
assert.equal(deliveries.destinationKind.name, "destination_kind");
assert.equal(deliveries.destinationSnapshot.name, "destination_snapshot");
assert.equal(deliveries.status.name, "status");
assert.equal(deliveries.createdBy.name, "created_by");
assert.equal(deliveries.assignedBy.name, "assigned_by");
assert.equal(deliveries.dispatchedBy.name, "dispatched_by");
assert.equal(deliveries.completedBy.name, "completed_by");
assert.equal(deliveries.cancelledBy.name, "cancelled_by");
assert.equal(deliveries.cancellationReason.name, "cancellation_reason");

assert.equal(deliveryItems.deliveryId.name, "delivery_id");
assert.equal(deliveryItems.skuId.name, "sku_id");
assert.equal(deliveryItems.quantity.name, "quantity");
assert.equal(deliveryItems.itemReference.name, "item_reference");

const deliveryTableConfig = getTableConfig(deliveries);
const deliveryReferenceIndex = deliveryTableConfig.indexes.find(
  (index) => index.config.name === "deliveries_reference_unique",
);

assert.ok(deliveryReferenceIndex, "expected deliveries.reference unique index");
assert.equal(deliveryReferenceIndex.config.unique, true);
assert.deepEqual(
  deliveryReferenceIndex.config.columns.map((column) =>
    "name" in column ? column.name : null,
  ),
  ["reference"],
);

assert.deepEqual(deliveryStatusEnum.enumValues, [
  "draft",
  "assigned",
  "in_transit",
  "completed",
  "cancelled",
]);
assert.deepEqual(deliverySourceTypeEnum.enumValues, [
  "pos_sale",
  "online_order",
  "transfer",
]);

const allMigrationSql = readAllMigrationSql();

assert.match(
  allMigrationSql,
  /CREATE UNIQUE INDEX "deliveries_source_unique" ON "deliveries"/,
  "expected unique index on (source_type, source_reference)",
);
assert.match(
  allMigrationSql,
  /"deliveries_destination_kind_consistent"/,
  "expected destination-kind consistency check constraint",
);
assert.match(
  allMigrationSql,
  /"deliveries_origin_destination_distinct"/,
  "expected origin/destination distinct check constraint",
);
assert.match(
  allMigrationSql,
  /ALTER TABLE "deliveries" ALTER COLUMN "created_by" SET NOT NULL/,
  "expected created_by tightened to NOT NULL",
);
assert.match(
  allMigrationSql,
  /ALTER TABLE "delivery_items" ALTER COLUMN "item_reference" SET NOT NULL/,
  "expected item_reference tightened to NOT NULL",
);
assert.match(
  allMigrationSql,
  /"deliveries_cancellation_reason_consistent"/,
  "expected cancellation-reason consistency check constraint",
);
assert.match(
  allMigrationSql,
  /"deliveries_assigned_state_consistent"/,
  "expected assigned-state consistency check constraint",
);
assert.match(
  allMigrationSql,
  /"deliveries_in_transit_state_consistent"/,
  "expected in-transit-state consistency check constraint",
);
assert.match(
  allMigrationSql,
  /"deliveries_completed_state_consistent"/,
  "expected completed-state consistency check constraint",
);
assert.match(
  allMigrationSql,
  /"deliveries_cancelled_state_consistent"/,
  "expected cancelled-state consistency check constraint",
);
assert.match(
  allMigrationSql,
  /ADD COLUMN "cancellation_reason" varchar\(240\)/,
  "expected cancellation_reason column",
);
assert.match(
  allMigrationSql,
  /ADD COLUMN "reference" varchar\(40\)/,
  "expected delivery reference column",
);
assert.match(
  allMigrationSql,
  /SET "reference" = 'DLV-'/,
  "expected delivery reference backfill",
);
assert.match(
  allMigrationSql,
  /"sequence_key", "current_value", "description"\)\s*SELECT\s*'delivery'/,
  "expected delivery sequence counter backfill",
);
assert.match(
  allMigrationSql,
  /ALTER TABLE "deliveries" ALTER COLUMN "reference" SET NOT NULL/,
  "expected delivery reference not-null enforcement after backfill",
);
assert.match(
  allMigrationSql,
  /CREATE UNIQUE INDEX "deliveries_reference_unique" ON "deliveries"/,
  "expected unique index on delivery reference",
);

console.log("deliveries schema assertions passed");

function readAllMigrationSql(): string {
  const drizzleDirectory = resolve(process.cwd(), "drizzle");
  return readdirSync(drizzleDirectory)
    .filter((entry) => extname(entry) === ".sql")
    .map((entry) => readFileSync(resolve(drizzleDirectory, entry), "utf8"))
    .join("\n");
}
