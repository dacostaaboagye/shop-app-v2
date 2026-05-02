import type {
  catalogBrands,
  catalogCategories,
  catalogProductOptions,
  catalogProductOptionValues,
  catalogProducts,
  productVariants,
} from "@shop/database";
import type { CatalogChangeOperation } from "../catalog-change-log/catalog-change-log.types.js";

/**
 * Explicit allowlists per entity. Only listed fields contribute to
 * `changedFields` and the before/after JSON snapshots in catalog_change_log.
 *
 * Audit / metadata columns (`id`, `slug`, `createdAt`, `updatedAt`,
 * `createdBy`, `archivedAt`) are intentionally excluded — they are not
 * user-meaningful changes; transitions are captured via the `operation`
 * column instead (e.g. archived/restored).
 */
export const TRACKED_PRODUCT_FIELDS = [
  "name",
  "description",
  "categoryId",
  "brandId",
  "countryOfOrigin",
  "isTaxable",
  "taxCategory",
  "priceIncludesTax",
  "status",
  "features",
] as const satisfies readonly (keyof ProductSnapshot)[];

export const TRACKED_VARIANT_FIELDS = [
  "name",
  "sku",
  "barcode",
  "unitOfMeasure",
  "costPrice",
  "sellingPrice",
  "attributes",
  "weightGrams",
  "dimensionsCm",
  "packagingType",
  "manufacturerPartNumber",
  "customsCode",
  "isTaxable",
  "taxCategory",
  "isDefault",
  "status",
] as const satisfies readonly (keyof VariantSnapshot)[];

export const TRACKED_BRAND_FIELDS = [
  "name",
  "description",
  "website",
  "status",
] as const satisfies readonly (keyof BrandSnapshot)[];

export const TRACKED_CATEGORY_FIELDS = [
  "name",
  "description",
  "parentCategoryId",
  "status",
] as const satisfies readonly (keyof CategorySnapshot)[];

export const TRACKED_OPTION_FIELDS = [
  "name",
  "position",
] as const satisfies readonly (keyof OptionSnapshot)[];

export const TRACKED_OPTION_VALUE_FIELDS = [
  "value",
  "position",
] as const satisfies readonly (keyof OptionValueSnapshot)[];

export type ProductSnapshot = Pick<
  typeof catalogProducts.$inferSelect,
  | "name"
  | "description"
  | "categoryId"
  | "brandId"
  | "countryOfOrigin"
  | "isTaxable"
  | "taxCategory"
  | "priceIncludesTax"
  | "status"
  | "features"
>;

export type VariantSnapshot = Pick<
  typeof productVariants.$inferSelect,
  | "name"
  | "sku"
  | "barcode"
  | "unitOfMeasure"
  | "costPrice"
  | "sellingPrice"
  | "attributes"
  | "weightGrams"
  | "dimensionsCm"
  | "packagingType"
  | "manufacturerPartNumber"
  | "customsCode"
  | "isTaxable"
  | "taxCategory"
  | "isDefault"
  | "status"
>;

export type BrandSnapshot = Pick<
  typeof catalogBrands.$inferSelect,
  "name" | "description" | "website" | "status"
>;

export type CategorySnapshot = Pick<
  typeof catalogCategories.$inferSelect,
  "name" | "description" | "parentCategoryId" | "status"
>;

export type OptionSnapshot = Pick<
  typeof catalogProductOptions.$inferSelect,
  "name" | "position"
>;

export type OptionValueSnapshot = Pick<
  typeof catalogProductOptionValues.$inferSelect,
  "value" | "position"
>;

export function snapshotProduct(
  row: typeof catalogProducts.$inferSelect,
): ProductSnapshot {
  return {
    name: row.name,
    description: row.description,
    categoryId: row.categoryId,
    brandId: row.brandId,
    countryOfOrigin: row.countryOfOrigin,
    isTaxable: row.isTaxable,
    taxCategory: row.taxCategory,
    priceIncludesTax: row.priceIncludesTax,
    status: row.status,
    features: row.features,
  };
}

export function snapshotVariant(
  row: typeof productVariants.$inferSelect,
): VariantSnapshot {
  return {
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    unitOfMeasure: row.unitOfMeasure,
    costPrice: row.costPrice,
    sellingPrice: row.sellingPrice,
    attributes: row.attributes,
    weightGrams: row.weightGrams,
    dimensionsCm: row.dimensionsCm ?? null,
    packagingType: row.packagingType,
    manufacturerPartNumber: row.manufacturerPartNumber,
    customsCode: row.customsCode,
    isTaxable: row.isTaxable,
    taxCategory: row.taxCategory,
    isDefault: row.isDefault,
    status: row.status,
  };
}

export function snapshotBrand(
  row: typeof catalogBrands.$inferSelect,
): BrandSnapshot {
  return {
    name: row.name,
    description: row.description,
    website: row.website,
    status: row.status,
  };
}

export function snapshotCategory(
  row: typeof catalogCategories.$inferSelect,
): CategorySnapshot {
  return {
    name: row.name,
    description: row.description,
    parentCategoryId: row.parentCategoryId,
    status: row.status,
  };
}

export function snapshotOption(
  row: typeof catalogProductOptions.$inferSelect,
): OptionSnapshot {
  return {
    name: row.name,
    position: row.position,
  };
}

export function snapshotOptionValue(
  row: typeof catalogProductOptionValues.$inferSelect,
): OptionValueSnapshot {
  return {
    value: row.value,
    position: row.position,
  };
}

/**
 * Map a status transition to the appropriate change-log operation. Status
 * changes from `active` -> `archived` and `archived` -> `active` are first-
 * class operations (`archived` / `restored`); other status changes — and any
 * non-status field change — fall under `updated`.
 */
export function operationFromStatusTransition(
  beforeStatus: "active" | "archived",
  afterStatus: "active" | "archived",
): CatalogChangeOperation {
  if (beforeStatus === afterStatus) return "updated";
  if (afterStatus === "archived") return "archived";
  return "restored";
}
