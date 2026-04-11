import type { AdminProductSummary, AdminVariantSummary } from "@shop/contracts";
import type { Pool } from "pg";
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

export const VARIANT_RETURNING = `
  slug, name, sku, barcode,
  unit_of_measure AS "unitOfMeasure",
  cost_price AS "costPrice",
  selling_price AS "sellingPrice",
  attributes,
  weight_grams AS "weightGrams",
  dimensions_cm AS "dimensionsCm",
  packaging_type AS "packagingType",
  manufacturer_part_number AS "manufacturerPartNumber",
  customs_code AS "customsCode",
  is_default AS "isDefault",
  status,
  created_at AS "createdAt",
  archived_at AS "archivedAt"
`;

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
  pool: Pick<Pool, "query">,
  categorySlug: string | null | undefined,
): Promise<string | null> {
  if (!categorySlug) return null;

  const result = await pool.query<{ id: string }>(
    `SELECT id FROM catalog_categories WHERE slug = $1`,
    [categorySlug],
  );

  const id = result.rows[0]?.id;
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
  pool: Pick<Pool, "query">,
  brandSlug: string | null | undefined,
): Promise<string | null> {
  if (!brandSlug) return null;

  const result = await pool.query<{ id: string }>(
    `SELECT id FROM catalog_brands WHERE slug = $1`,
    [brandSlug],
  );

  const id = result.rows[0]?.id;
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
