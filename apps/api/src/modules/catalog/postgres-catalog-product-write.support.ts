import type {
  AdminProductDetail,
  AdminProductSummary,
  AdminVariantSummary,
} from "@shop/contracts";
import {
  catalogBrands,
  catalogCategories,
  catalogMediaAssignments,
  type catalogProducts,
  type productVariants,
} from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";

export const DUPLICATE_KEY_CODE = "23505";

export type ProductSummaryRow = Omit<
  AdminProductSummary,
  "archivedAt" | "createdAt"
> & {
  archivedAt: Date | null;
  createdAt: Date;
};

export type VariantRow = Omit<
  AdminVariantSummary,
  "archivedAt" | "createdAt" | "attributes" | "dimensionsCm"
> & {
  archivedAt: Date | null;
  attributes: Record<string, string>;
  createdAt: Date;
  dimensionsCm: { height?: number; length?: number; width?: number } | null;
};

export function toProductSummary(row: ProductSummaryRow): AdminProductSummary {
  return {
    ...row,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    features: (row.features as string[]) ?? [],
  };
}

export function toVariantSummary(row: VariantRow): AdminVariantSummary {
  return {
    ...row,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function toProductVariantSummary(
  variant: typeof productVariants.$inferSelect,
): AdminVariantSummary {
  return {
    slug: variant.slug,
    name: variant.name,
    sku: variant.sku,
    barcode: variant.barcode,
    unitOfMeasure: variant.unitOfMeasure,
    costPrice: variant.costPrice,
    sellingPrice: variant.sellingPrice,
    attributes: variant.attributes,
    weightGrams: variant.weightGrams,
    dimensionsCm: variant.dimensionsCm ?? null,
    packagingType: variant.packagingType,
    manufacturerPartNumber: variant.manufacturerPartNumber,
    customsCode: variant.customsCode,
    isTaxable: variant.isTaxable,
    taxCategory: variant.taxCategory,
    isDefault: variant.isDefault,
    status: variant.status,
    createdAt: variant.createdAt.toISOString(),
    archivedAt: variant.archivedAt?.toISOString() ?? null,
  };
}

export function translateDuplicateKey(error: unknown, sku: string): unknown {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === DUPLICATE_KEY_CODE
  ) {
    return new AppError({
      code: "conflict",
      detail: sku
        ? `A variant with SKU "${sku}" already exists.`
        : "A variant with that SKU already exists.",
      statusCode: 409,
      title: "SKU already exists",
    });
  }
  return error;
}

export async function resolveCategoryId(
  db: ApiDatabase,
  categorySlug: string | null | undefined,
): Promise<string | null> {
  if (!categorySlug) return null;

  const result = await db
    .select({ id: catalogCategories.id })
    .from(catalogCategories)
    .where(eq(catalogCategories.slug, categorySlug))
    .limit(1);

  const id = result[0]?.id;
  if (!id) {
    throw new AppError({
      code: "not_found",
      detail: `Category "${categorySlug}" does not exist.`,
      statusCode: 404,
      title: "Category not found",
    });
  }

  return id;
}

export type ProductDetailAggregateRow = {
  brandSlug: string | null;
  categorySlug: string | null;
  variantCount: number;
};

export type ProductDetailRecord = {
  row: ProductDetailAggregateRow | undefined;
  updated: typeof catalogProducts.$inferSelect;
  variants: Array<typeof productVariants.$inferSelect>;
};

export function toProductDetail(
  input: ProductDetailRecord,
): AdminProductDetail {
  return {
    slug: input.updated.slug,
    name: input.updated.name,
    description: input.updated.description,
    features: input.updated.features,
    categorySlug: input.row?.categorySlug ?? null,
    brandSlug: input.row?.brandSlug ?? null,
    countryOfOrigin: input.updated.countryOfOrigin,
    isTaxable: input.updated.isTaxable,
    taxCategory: input.updated.taxCategory,
    priceIncludesTax: input.updated.priceIncludesTax,
    status: input.updated.status,
    variantCount: input.row?.variantCount ?? 0,
    createdAt: input.updated.createdAt.toISOString(),
    archivedAt: input.updated.archivedAt?.toISOString() ?? null,
    options: [],
    variants: input.variants.map(toProductVariantSummary),
  };
}

export async function deleteProductMediaAssignments(
  db: ApiDatabase,
  productSlug: string,
  variantSlugs: string[],
): Promise<void> {
  await db
    .delete(catalogMediaAssignments)
    .where(
      and(
        eq(catalogMediaAssignments.entityType, "product"),
        eq(catalogMediaAssignments.entitySlug, productSlug),
      ),
    );

  for (const variantSlug of variantSlugs) {
    await db
      .delete(catalogMediaAssignments)
      .where(
        and(
          eq(catalogMediaAssignments.entityType, "variant"),
          eq(catalogMediaAssignments.entitySlug, variantSlug),
        ),
      );
  }
}

export async function resolveBrandId(
  db: ApiDatabase,
  brandSlug: string | null | undefined,
): Promise<string | null> {
  if (!brandSlug) return null;

  const result = await db
    .select({ id: catalogBrands.id })
    .from(catalogBrands)
    .where(eq(catalogBrands.slug, brandSlug))
    .limit(1);

  const id = result[0]?.id;
  if (!id) {
    throw new AppError({
      code: "not_found",
      detail: `Brand "${brandSlug}" does not exist.`,
      statusCode: 404,
      title: "Brand not found",
    });
  }

  return id;
}
