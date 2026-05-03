import type { AdminUpdateProductRequest } from "@shop/contracts";
import {
  catalogBrands,
  catalogCategories,
  catalogProducts,
  productVariants,
} from "@shop/database";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import {
  resolveBrandId,
  resolveCategoryId,
} from "./postgres-catalog-product-write.support.js";

export type ProductDetailQueryRow = {
  brandSlug: string | null;
  categorySlug: string | null;
  variantCount: number;
};

/**
 * Translate an `AdminUpdateProductRequest` payload into the partial set of
 * column updates. Resolves brand and category slug lookups against the live
 * db (read-only validations that throw 404 if a slug is unknown).
 */
export async function buildProductUpdates(
  db: ApiDatabase,
  payload: AdminUpdateProductRequest,
  now: Date,
): Promise<Partial<typeof catalogProducts.$inferInsert>> {
  const updates: Partial<typeof catalogProducts.$inferInsert> = {
    updatedAt: now,
  };

  if (payload.name !== undefined) updates.name = payload.name;
  if ("description" in payload)
    updates.description = payload.description ?? null;
  if ("categorySlug" in payload) {
    updates.categoryId = await resolveCategoryId(
      db,
      payload.categorySlug ?? null,
    );
  }
  if ("brandSlug" in payload) {
    updates.brandId = await resolveBrandId(db, payload.brandSlug ?? null);
  }
  if ("countryOfOrigin" in payload)
    updates.countryOfOrigin = payload.countryOfOrigin ?? null;
  if (payload.isTaxable !== undefined) updates.isTaxable = payload.isTaxable;
  if ("taxCategory" in payload)
    updates.taxCategory = payload.taxCategory ?? null;
  if (payload.features !== undefined) updates.features = payload.features;
  if (payload.priceIncludesTax !== undefined)
    updates.priceIncludesTax = payload.priceIncludesTax;

  if (payload.status !== undefined) {
    if (payload.status === "archived") {
      updates.archivedAt = now;
    }
    updates.status = payload.status;
  }

  return updates;
}

/**
 * Cascade-archive every active variant of a product. Reads BEFORE the
 * update so the caller can capture per-variant `before` snapshots for
 * the change log.
 */
export async function archiveActiveVariantsForProduct(
  tx: ApiDatabase,
  productId: string,
  now: Date,
): Promise<{
  before: Array<typeof productVariants.$inferSelect>;
  after: Array<typeof productVariants.$inferSelect>;
}> {
  const beforeRows = await tx
    .select()
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, productId),
        ne(productVariants.status, "archived"),
      ),
    );

  if (beforeRows.length === 0) return { before: [], after: [] };

  const afterRows = await tx
    .update(productVariants)
    .set({
      status: "archived",
      archivedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(productVariants.productId, productId),
        ne(productVariants.status, "archived"),
      ),
    )
    .returning();

  return { before: beforeRows, after: afterRows };
}

export async function loadProductDetailAggregate(
  tx: ApiDatabase,
  productId: string,
): Promise<ProductDetailQueryRow | undefined> {
  const [row] = await tx
    .select({
      brandSlug: catalogBrands.slug,
      categorySlug: catalogCategories.slug,
      variantCount: sql<number>`cast(count(${productVariants.id}) as int)`,
    })
    .from(catalogProducts)
    .leftJoin(
      catalogCategories,
      eq(catalogCategories.id, catalogProducts.categoryId),
    )
    .leftJoin(catalogBrands, eq(catalogBrands.id, catalogProducts.brandId))
    .leftJoin(
      productVariants,
      eq(productVariants.productId, catalogProducts.id),
    )
    .where(eq(catalogProducts.id, productId))
    .groupBy(catalogProducts.id, catalogCategories.slug, catalogBrands.slug);

  return row;
}

export async function loadProductVariants(
  tx: ApiDatabase,
  productId: string,
): Promise<Array<typeof productVariants.$inferSelect>> {
  return tx
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
    .orderBy(desc(productVariants.isDefault), asc(productVariants.createdAt));
}
