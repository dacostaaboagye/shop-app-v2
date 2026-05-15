import type {
  AdminCreateProductRequest,
  AdminCreateVariantRequest,
  CatalogImportRowError,
} from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import type { CatalogImportFailedRow } from "./catalog-import.repository.js";
import type { parseCatalogImportCsv } from "./catalog-import-parser.js";

export type CatalogImportValidRow = ReturnType<
  typeof parseCatalogImportCsv
>["validRows"][number];

export function toProductPayload(
  row: CatalogImportValidRow,
): AdminCreateProductRequest {
  return {
    brandSlug: row.brandSlug ?? null,
    categorySlug: row.categorySlug ?? null,
    countryOfOrigin: row.countryOfOrigin ?? null,
    description: row.description ?? null,
    isTaxable: row.isTaxable ?? true,
    name: row.productName,
    priceIncludesTax: row.priceIncludesTax ?? false,
    status: row.status,
    taxCategory: row.taxCategory ?? null,
  };
}

export function toVariantPayload(
  row: CatalogImportValidRow,
): AdminCreateVariantRequest {
  return {
    attributes: row.attributes,
    barcode: row.barcode ?? null,
    costPrice: row.costPrice,
    customsCode: row.customsCode ?? null,
    isDefault: false,
    manufacturerPartNumber: row.manufacturerPartNumber ?? null,
    name: row.variantName,
    packagingType: row.packagingType ?? null,
    sellingPrice: row.sellingPrice,
    sku: row.sku,
    status: row.status,
    unitOfMeasure: row.unitOfMeasure,
    weightGrams: row.weightGrams ?? null,
  };
}

export function parserFailures(
  errors: CatalogImportRowError[],
  originalRows: Map<number, Record<string, string>>,
): CatalogImportFailedRow[] {
  const grouped = new Map<number, CatalogImportRowError[]>();
  for (const error of errors) {
    grouped.set(error.rowNumber, [
      ...(grouped.get(error.rowNumber) ?? []),
      error,
    ]);
  }
  return [...grouped].map(([rowNumber, rowErrors]) => ({
    errors: rowErrors,
    originalRow: originalRows.get(rowNumber) ?? {},
    rowNumber,
  }));
}

export function failedFromError(
  rowNumber: number,
  error: unknown,
  originalRow: Record<string, string>,
): CatalogImportFailedRow {
  const message =
    error instanceof AppError ? error.message : "Row could not be imported.";
  return {
    errors: [rowError(rowNumber, "invalid_value", message)],
    originalRow,
    rowNumber,
  };
}

export function rowError(
  rowNumber: number,
  code: CatalogImportRowError["code"],
  message: string,
  field?: CatalogImportRowError["field"],
): CatalogImportRowError {
  return field
    ? { code, field, message, rowNumber }
    : { code, message, rowNumber };
}

export function failureMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message.length > 0) return error.message;
  return "Catalog import processing failed.";
}
