import type { productVariants } from "@shop/database";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { diffSnapshot } from "../catalog-change-log/catalog-change-diff.js";
import type { CatalogChangeLogWriter } from "../catalog-change-log/catalog-change-log-writer.js";
import {
  operationFromStatusTransition,
  snapshotVariant,
  TRACKED_VARIANT_FIELDS,
} from "./catalog-change-tracking.js";

type VariantRow = typeof productVariants.$inferSelect;
type ActorContext = { actorId: string; now: Date };

/**
 * Compute the variant diff and emit a change-log row.
 * No-op short-circuit applies to `updated`; status transitions
 * (archived/restored) always emit even with empty changedFields.
 */
export async function recordVariantUpdate(
  tx: ApiDatabase,
  writer: CatalogChangeLogWriter,
  productId: string,
  before: VariantRow,
  after: VariantRow,
  ctx: ActorContext,
): Promise<void> {
  const diff = diffSnapshot(
    snapshotVariant(before),
    snapshotVariant(after),
    TRACKED_VARIANT_FIELDS,
  );

  const operation = operationFromStatusTransition(before.status, after.status);

  if (operation === "updated" && diff.changedFields.length === 0) return;

  await writer.record(tx, {
    entityType: "product_variant",
    entityId: after.id,
    entityRef: after.sku,
    parentEntityType: "catalog_product",
    parentEntityId: productId,
    operation,
    changedFields: diff.changedFields,
    before: diff.before,
    after: diff.after,
    actorId: ctx.actorId,
    occurredAt: ctx.now,
  });
}

export async function recordVariantCreated(
  tx: ApiDatabase,
  writer: CatalogChangeLogWriter,
  productId: string,
  variant: VariantRow,
  ctx: ActorContext,
): Promise<void> {
  await writer.record(tx, {
    entityType: "product_variant",
    entityId: variant.id,
    entityRef: variant.sku,
    parentEntityType: "catalog_product",
    parentEntityId: productId,
    operation: "created",
    changedFields: [],
    before: null,
    after: snapshotVariant(variant),
    actorId: ctx.actorId,
    occurredAt: ctx.now,
  });
}

export async function recordVariantDeleted(
  tx: ApiDatabase,
  writer: CatalogChangeLogWriter,
  productId: string,
  variant: VariantRow,
  ctx: ActorContext,
): Promise<void> {
  await writer.record(tx, {
    entityType: "product_variant",
    entityId: variant.id,
    entityRef: variant.sku,
    parentEntityType: "catalog_product",
    parentEntityId: productId,
    operation: "deleted",
    changedFields: TRACKED_VARIANT_FIELDS as unknown as string[],
    before: snapshotVariant(variant),
    after: null,
    actorId: ctx.actorId,
    occurredAt: ctx.now,
  });
}
