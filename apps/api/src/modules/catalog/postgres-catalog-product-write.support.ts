import type { AdminProductSummary, AdminVariantSummary } from "@shop/contracts";
import { eq } from "drizzle-orm";
import { catalogBrands, catalogCategories } from "@shop/database";
import { AppError } from "../_core/errors/app-error.js";
import type { ApiDatabase } from "../../infrastructure/database.js";

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
