import {
  catalogBrands,
  catalogCategories,
  type catalogProducts,
  type productVariants,
} from "@shop/database";
import { inArray } from "drizzle-orm";
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

export async function recordProductCreated(
  tx: ApiDatabase,
  writer: CatalogChangeLogWriter,
  row: ProductRow,
  ctx: ActorContext,
): Promise<void> {
  const [snapshotContext] = await loadProductSnapshotContexts(tx, [row]);

  await writer.record(tx, {
    entityType: "catalog_product",
    entityId: row.id,
    entityRef: row.slug,
    operation: "created",
    changedFields: [],
    before: null,
    after: snapshotProduct(row, snapshotContext),
    actorId: ctx.actorId,
    occurredAt: ctx.now,
  });
}

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
  const [beforeContext, afterContext] = await loadProductSnapshotContexts(tx, [
    before,
    after,
  ]);
  const diff = diffSnapshot(
    snapshotProduct(before, beforeContext),
    snapshotProduct(after, afterContext),
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
  const [productContext] = await loadProductSnapshotContexts(tx, [product]);

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
    before: snapshotProduct(product, productContext),
    after: null,
    actorId: ctx.actorId,
    occurredAt: ctx.now,
  });
}

async function loadProductSnapshotContexts(
  tx: ApiDatabase,
  rows: ProductRow[],
) {
  const categoryIds = uniqueStrings(rows.map((row) => row.categoryId));
  const brandIds = uniqueStrings(rows.map((row) => row.brandId));
  const categories =
    categoryIds.length === 0
      ? []
      : await tx
          .select({ id: catalogCategories.id, name: catalogCategories.name })
          .from(catalogCategories)
          .where(inArray(catalogCategories.id, categoryIds));
  const brands =
    brandIds.length === 0
      ? []
      : await tx
          .select({ id: catalogBrands.id, name: catalogBrands.name })
          .from(catalogBrands)
          .where(inArray(catalogBrands.id, brandIds));
  const categoryNames = new Map(categories.map((row) => [row.id, row.name]));
  const brandNames = new Map(brands.map((row) => [row.id, row.name]));

  return rows.map((row) => ({
    brandName:
      row.brandId === null ? null : (brandNames.get(row.brandId) ?? null),
    categoryName:
      row.categoryId === null
        ? null
        : (categoryNames.get(row.categoryId) ?? null),
  }));
}

function uniqueStrings(values: Array<string | null>): string[] {
  return [
    ...new Set(values.filter((value): value is string => value !== null)),
  ];
}
