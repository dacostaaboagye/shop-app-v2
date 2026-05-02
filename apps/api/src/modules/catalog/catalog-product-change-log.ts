import type { catalogProducts, productVariants } from "@shop/database";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { diffSnapshot } from "../catalog-change-log/catalog-change-diff.js";
import type { CatalogChangeLogWriter } from "../catalog-change-log/catalog-change-log-writer.js";
import {
  operationFromStatusTransition,
  snapshotProduct,
  snapshotVariant,
  TRACKED_PRODUCT_FIELDS,
  TRACKED_VARIANT_FIELDS,
} from "./catalog-change-tracking.js";

type ProductRow = typeof catalogProducts.$inferSelect;
type VariantRow = typeof productVariants.$inferSelect;
type ActorContext = { actorId: string; now: Date };

/**
 * Compute the product diff and emit a change-log row.
 * No-op short-circuit: if operation resolves to `updated` and no tracked
 * field changed, no row is written. State transitions (archived/restored)
 * always emit even with empty changedFields.
 */
export async function recordProductUpdate(
  tx: ApiDatabase,
  writer: CatalogChangeLogWriter,
  before: ProductRow,
  after: ProductRow,
  ctx: ActorContext,
): Promise<void> {
  const diff = diffSnapshot(
    snapshotProduct(before),
    snapshotProduct(after),
    TRACKED_PRODUCT_FIELDS,
  );

  const operation = operationFromStatusTransition(before.status, after.status);

  if (operation === "updated" && diff.changedFields.length === 0) return;

  await writer.record(tx, {
    entityType: "catalog_product",
    entityId: after.id,
    entityRef: after.slug,
    operation,
    changedFields: diff.changedFields,
    before: diff.before,
    after: diff.after,
    actorId: ctx.actorId,
    occurredAt: ctx.now,
  });
}

/**
 * Emit one change-log row per cascaded variant archive. All rows share the
 * supplied actorId + occurredAt so the cascade reads as a single event.
 */
export async function recordVariantArchiveCascade(
  tx: ApiDatabase,
  writer: CatalogChangeLogWriter,
  productId: string,
  cascade: { before: VariantRow[]; after: VariantRow[] },
  ctx: ActorContext,
): Promise<void> {
  for (let i = 0; i < cascade.before.length; i++) {
    const variantBefore = cascade.before[i];
    const variantAfter = cascade.after[i];
    if (!variantBefore || !variantAfter) continue;
    await writer.record(tx, {
      entityType: "product_variant",
      entityId: variantBefore.id,
      entityRef: variantBefore.sku,
      parentEntityType: "catalog_product",
      parentEntityId: productId,
      operation: "archived",
      changedFields: ["status"],
      before: { status: variantBefore.status },
      after: { status: variantAfter.status },
      actorId: ctx.actorId,
      occurredAt: ctx.now,
    });
  }
}

/**
 * Emit `deleted` rows for the product and each of its variants. All rows
 * share the supplied actorId + occurredAt.
 */
export async function recordProductDeletion(
  tx: ApiDatabase,
  writer: CatalogChangeLogWriter,
  product: ProductRow,
  variants: VariantRow[],
  ctx: ActorContext,
): Promise<void> {
  for (const variant of variants) {
    await writer.record(tx, {
      entityType: "product_variant",
      entityId: variant.id,
      entityRef: variant.sku,
      parentEntityType: "catalog_product",
      parentEntityId: product.id,
      operation: "deleted",
      changedFields: TRACKED_VARIANT_FIELDS as unknown as string[],
      before: snapshotVariant(variant),
      after: null,
      actorId: ctx.actorId,
      occurredAt: ctx.now,
    });
  }

  await writer.record(tx, {
    entityType: "catalog_product",
    entityId: product.id,
    entityRef: product.slug,
    operation: "deleted",
    changedFields: TRACKED_PRODUCT_FIELDS as unknown as string[],
    before: snapshotProduct(product),
    after: null,
    actorId: ctx.actorId,
    occurredAt: ctx.now,
  });
}
