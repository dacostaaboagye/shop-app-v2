// biome-ignore-all format: compact parser stays under the repository source line limit.
// biome-ignore-all assist/source/organizeImports: compact parser stays under the repository source line limit.
import { catalogImportOptionalColumns, catalogImportRequiredColumns, catalogImportStatusSchema, type CatalogImportNormalizedRow, type CatalogImportParseSummary, type CatalogImportRowError } from "@shop/contracts";
import { catalogImportOriginalRows, parseCatalogImportCsvRecords, toCatalogImportRowMap, type CatalogImportCsvRecord } from "./catalog-import-csv.js";

export const DEFAULT_CATALOG_IMPORT_MAX_ROWS = 1_000;
export type CatalogImportParseResult = { errors: CatalogImportRowError[]; summary: CatalogImportParseSummary; validRows: CatalogImportNormalizedRow[] };

type RowMap = Record<string, string>;
type FieldName = NonNullable<CatalogImportRowError["field"]>;
type ErrorCode = CatalogImportRowError["code"];

const allColumns = new Set<string>([...catalogImportRequiredColumns, ...catalogImportOptionalColumns]);
const trueValues = new Set(["true", "yes", "1"]);
const falseValues = new Set(["false", "no", "0"]);

export function parseCatalogImportCsv(csvText: string, options: { maxRows?: number } = {}): CatalogImportParseResult {
  const maxRows = options.maxRows ?? DEFAULT_CATALOG_IMPORT_MAX_ROWS;
  const parsed = parseCatalogImportCsvRecords(csvText);
  if (parsed.error) return emptyResult(maxRows, [parsed.error]);

  const records = parsed.records.filter((record) => record.values.some((value) => value.trim().length > 0));
  const header = records[0]?.values.map((value) => value.trim()) ?? [];
  const headerErrors = getHeaderErrors(header);
  if (records.length === 0 || headerErrors.length > 0) {
    return emptyResult(maxRows, headerErrors);
  }

  const dataRows = records.slice(1);
  const errors: CatalogImportRowError[] = [];
  const validRows: CatalogImportNormalizedRow[] = [];
  const seenSkus = new Map<string, number>();
  const seenBarcodes = new Map<string, number>();
  if (dataRows.length > maxRows) {
    errors.push(rowError(dataRows[Math.max(0, maxRows - 1)]?.rowNumber ?? 1, "row_limit_exceeded", `Only the first ${maxRows} rows were parsed.`));
  }

  for (const record of dataRows.slice(0, maxRows)) {
    const row = toCatalogImportRowMap(header, record.values);
    const rowErrors = getRowErrors(record, header, row);
    const costPrice = money(row.costPrice, record.rowNumber, "costPrice", rowErrors);
    const sellingPrice = money(row.sellingPrice, record.rowNumber, "sellingPrice", rowErrors);
    const status = statusValue(row.status, record.rowNumber, rowErrors);
    const attributes = attributesValue(row.attributesJson, record.rowNumber, rowErrors);
    const weightGrams = positiveInt(row.weightGrams, record.rowNumber, rowErrors);
    const isTaxable = bool(row.isTaxable, record.rowNumber, "isTaxable", rowErrors);
    const priceIncludesTax = bool(row.priceIncludesTax, record.rowNumber, "priceIncludesTax", rowErrors);
    const countryOfOrigin = country(row.countryOfOrigin, record.rowNumber, rowErrors);
    unique(row.sku, "sku", record.rowNumber, seenSkus, rowErrors);
    unique(row.barcode, "barcode", record.rowNumber, seenBarcodes, rowErrors);

    if (rowErrors.length > 0 || !costPrice || !sellingPrice || !status || !attributes) {
      errors.push(...rowErrors);
      continue;
    }

    validRows.push({
      attributes,
      costPrice,
      productName: clean(row.productName),
      rowNumber: record.rowNumber,
      sellingPrice,
      sku: clean(row.sku),
      status,
      unitOfMeasure: clean(row.unitOfMeasure),
      variantName: clean(row.variantName),
      ...optional("barcode", row.barcode), ...optional("brandSlug", row.brandSlug), ...optional("categorySlug", row.categorySlug), ...optional("customsCode", row.customsCode),
      ...optional("description", row.description), ...optional("manufacturerPartNumber", row.manufacturerPartNumber), ...optional("packagingType", row.packagingType), ...optional("taxCategory", row.taxCategory),
      ...(countryOfOrigin ? { countryOfOrigin } : {}), ...(isTaxable === undefined ? {} : { isTaxable }),
      ...(priceIncludesTax === undefined ? {} : { priceIncludesTax }), ...(weightGrams === undefined ? {} : { weightGrams }),
    });
  }

  return { errors, summary: buildSummary(dataRows.length, validRows.length, errors, maxRows), validRows };
}

export function parseCatalogImportOriginalRows(csvText: string): Map<number, RowMap> {
  const rows = catalogImportOriginalRows(csvText);
  rows.set(1, {});
  return rows;
}

function getHeaderErrors(header: string[]): CatalogImportRowError[] {
  if (header.length === 0) return [rowError(1, "malformed_csv", "CSV header row is required.")];
  const missing = catalogImportRequiredColumns
    .filter((column) => !header.includes(column))
    .map((column) => rowError(1, "missing_required", `${column} is required.`, column));
  const invalid = header
    .filter((column) => column.length > 0 && !allColumns.has(column))
    .map((column) => rowError(1, "malformed_csv", `Unsupported column "${column}".`));
  return [...missing, ...invalid];
}

function getRowErrors(record: CatalogImportCsvRecord, header: string[], row: RowMap): CatalogImportRowError[] {
  const errors = catalogImportRequiredColumns
    .filter((column) => clean(row[column]).length === 0)
    .map((column) => rowError(record.rowNumber, "missing_required", `${column} is required.`, column));
  if (record.values.length !== header.length) {
    errors.push(rowError(record.rowNumber, "malformed_csv", "Row has a different number of columns than the header."));
  }
  return errors;
}

function money(value: string | undefined, rowNumber: number, field: "costPrice" | "sellingPrice", errors: CatalogImportRowError[]): string | null {
  if (/^\d+(\.\d{1,2})?$/.test(value ?? "")) return Number(value).toFixed(2);
  errors.push(rowError(rowNumber, "invalid_money", "Money must use 0.00 format.", field));
  return null;
}

function statusValue(value: string | undefined, rowNumber: number, errors: CatalogImportRowError[]): "active" | "archived" | null {
  if (!value) return "active";
  const parsed = catalogImportStatusSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  errors.push(rowError(rowNumber, "invalid_status", "Status must be active or archived.", "status"));
  return null;
}

function attributesValue(value: string | undefined, rowNumber: number, errors: CatalogImportRowError[]): Record<string, string> | null {
  if (!value) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    errors.push(jsonError(rowNumber));
    return null;
  }
  if (isStringRecord(parsed)) return parsed;
  errors.push(jsonError(rowNumber));
  return null;
}

function unique(value: string | undefined, field: "barcode" | "sku", rowNumber: number, seen: Map<string, number>, errors: CatalogImportRowError[]): void {
  const key = value?.trim().toLowerCase();
  if (!key) return;
  const firstRow = seen.get(key);
  if (firstRow === undefined) {
    seen.set(key, rowNumber);
    return;
  }
  const code = field === "sku" ? "duplicate_sku" : "duplicate_barcode";
  const label = field === "sku" ? "SKU" : "Barcode";
  errors.push(rowError(rowNumber, code, `${label} duplicates row ${firstRow}.`, field));
}

function bool(value: string | undefined, rowNumber: number, field: "isTaxable" | "priceIncludesTax", errors: CatalogImportRowError[]): boolean | undefined {
  const key = value?.trim().toLowerCase();
  if (!key) return undefined;
  if (trueValues.has(key)) return true;
  if (falseValues.has(key)) return false;
  errors.push(rowError(rowNumber, "invalid_value", "Boolean values must be true or false.", field));
  return undefined;
}

function positiveInt(value: string | undefined, rowNumber: number, errors: CatalogImportRowError[]): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) return parsed;
  errors.push(rowError(rowNumber, "invalid_value", "Weight must be a positive whole number.", "weightGrams"));
  return undefined;
}

function country(value: string | undefined, rowNumber: number, errors: CatalogImportRowError[]): string | undefined {
  if (!value) return undefined;
  if (/^[A-Za-z]{2}$/.test(value)) return value.toUpperCase();
  errors.push(rowError(rowNumber, "invalid_value", "Country of origin must be a two-letter country code.", "countryOfOrigin"));
  return undefined;
}

function optional<K extends keyof CatalogImportNormalizedRow>(field: K, value: string | undefined): Partial<Pick<CatalogImportNormalizedRow, K>> {
  const trimmed = value?.trim(); return trimmed ? ({ [field]: trimmed } as Partial<Pick<CatalogImportNormalizedRow, K>>) : {};
}

function rowError(rowNumber: number, code: ErrorCode, message: string, field?: string): CatalogImportRowError {
  return field ? { code, field: field as FieldName, message, rowNumber } : { code, message, rowNumber };
}

function jsonError(rowNumber: number): CatalogImportRowError {
  return rowError(rowNumber, "malformed_json", "Attributes must be a JSON object with string values.", "attributesJson");
}

function emptyResult(maxRows: number, errors: CatalogImportRowError[]): CatalogImportParseResult {
  return { errors, summary: { invalidRows: 0, maxRows, totalRows: 0, truncated: false, validRows: 0 }, validRows: [] };
}

function buildSummary(totalRows: number, validRows: number, errors: CatalogImportRowError[], maxRows: number): CatalogImportParseSummary {
  const invalidRows = new Set(errors.map((item) => item.rowNumber).filter((rowNumber) => rowNumber > 1));
  return { invalidRows: invalidRows.size, maxRows, totalRows, truncated: totalRows > maxRows, validRows };
}

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}