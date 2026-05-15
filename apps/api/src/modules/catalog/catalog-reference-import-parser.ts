import type {
  CatalogReferenceImportEntity,
  CatalogReferenceImportResponse,
} from "@shop/contracts";
import { catalogEntityStatusSchema } from "@shop/contracts";
import {
  parseCatalogImportCsvRecords,
  toCatalogImportRowMap,
} from "./catalog-import-csv.js";

export const DEFAULT_REFERENCE_IMPORT_MAX_ROWS = 1_000;

export type ReferenceImportRow = {
  description: string | null;
  name: string;
  parentCategorySlug: string | null;
  rowNumber: number;
  status: "active" | "archived";
  website: string | null;
};

export type ReferenceImportFailure =
  CatalogReferenceImportResponse["failedRows"][number];

export type ReferenceImportParseResult = {
  errors: ReferenceImportFailure[];
  rows: ReferenceImportRow[];
  totalRows: number;
  truncated: boolean;
};

const columnsByEntity: Record<CatalogReferenceImportEntity, Set<string>> = {
  brand: new Set(["name", "description", "website", "status"]),
  category: new Set(["name", "description", "parentCategorySlug", "status"]),
};

export function parseReferenceImportCsv(
  csvText: string,
  entity: CatalogReferenceImportEntity,
  maxRows = DEFAULT_REFERENCE_IMPORT_MAX_ROWS,
): ReferenceImportParseResult {
  const parsed = parseCatalogImportCsvRecords(csvText);
  if (parsed.error) {
    return emptyResult([failure(1, {}, parsed.error.message, "malformed_csv")]);
  }

  const records = parsed.records.filter((record) =>
    record.values.some((value) => value.trim().length > 0),
  );
  const header = records[0]?.values.map((value) => value.trim()) ?? [];
  const dataRows = records.slice(1);
  const headerErrors = getHeaderErrors(header, entity);
  if (records.length === 0) {
    return emptyResult([
      failure(1, {}, "CSV header row is required.", "malformed_csv"),
    ]);
  }
  if (headerErrors.length > 0) {
    return emptyResult(headerErrors);
  }

  const errors: ReferenceImportFailure[] = [];
  const rows: ReferenceImportRow[] = [];
  const seen = new Set<string>();
  if (dataRows.length > maxRows) {
    errors.push(
      failure(
        dataRows[Math.max(0, maxRows - 1)]?.rowNumber ?? 1,
        {},
        `Only the first ${maxRows} rows were parsed.`,
        "row_limit_exceeded",
      ),
    );
  }

  for (const record of dataRows.slice(0, maxRows)) {
    const originalRow = toCatalogImportRowMap(header, record.values);
    const rowErrors = getRowErrors(record.rowNumber, originalRow, entity, seen);
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    rows.push({
      description: optionalText(originalRow.description),
      name: originalRow.name?.trim() ?? "",
      parentCategorySlug:
        entity === "category"
          ? optionalText(originalRow.parentCategorySlug)
          : null,
      rowNumber: record.rowNumber,
      status: parseStatus(originalRow.status) ?? "active",
      website: entity === "brand" ? optionalText(originalRow.website) : null,
    });
  }

  return {
    errors,
    rows,
    totalRows: dataRows.length,
    truncated: dataRows.length > maxRows,
  };
}

function getHeaderErrors(
  header: string[],
  entity: CatalogReferenceImportEntity,
): ReferenceImportFailure[] {
  if (header.length === 0) {
    return [failure(1, {}, "CSV header row is required.", "malformed_csv")];
  }
  const allowed = columnsByEntity[entity];
  const errors: ReferenceImportFailure[] = [];
  if (!header.includes("name")) {
    errors.push(
      failure(1, {}, "name is required.", "missing_required", "name"),
    );
  }
  for (const column of header) {
    if (column.length > 0 && !allowed.has(column)) {
      errors.push(
        failure(1, {}, `Unsupported column "${column}".`, "malformed_csv"),
      );
    }
  }
  return errors;
}

function getRowErrors(
  rowNumber: number,
  row: Record<string, string>,
  entity: CatalogReferenceImportEntity,
  seen: Set<string>,
): ReferenceImportFailure[] {
  const errors: ReferenceImportFailure[] = [];
  if (!row.name?.trim()) {
    errors.push(
      failure(rowNumber, row, "name is required.", "missing_required", "name"),
    );
  }
  if (row.status && !parseStatus(row.status)) {
    errors.push(
      failure(
        rowNumber,
        row,
        "Status must be active or archived.",
        "invalid_status",
        "status",
      ),
    );
  }
  const key = duplicateKey(row, entity);
  if (key && seen.has(key)) {
    errors.push(
      failure(
        rowNumber,
        row,
        "Name duplicates another row in this file.",
        "duplicate_name",
        "name",
      ),
    );
  }
  if (key && errors.length === 0) seen.add(key);
  return errors;
}

function duplicateKey(
  row: Record<string, string>,
  entity: CatalogReferenceImportEntity,
): string | null {
  const name = row.name?.trim().toLowerCase();
  if (!name) return null;
  const parent =
    entity === "category" ? (row.parentCategorySlug?.trim() ?? "") : "";
  return `${parent.toLowerCase()}:${name}`;
}

function parseStatus(value: string | undefined): "active" | "archived" | null {
  if (!value) return "active";
  const parsed = catalogEntityStatusSchema.safeParse(value.trim());
  return parsed.success ? parsed.data : null;
}

function optionalText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function failure(
  rowNumber: number,
  originalRow: Record<string, string>,
  message: string,
  code: ReferenceImportFailure["errors"][number]["code"],
  field?: string,
): ReferenceImportFailure {
  return {
    errors: [{ code, ...(field ? { field } : {}), message, rowNumber }],
    originalRow,
    rowNumber,
  };
}

function emptyResult(
  errors: ReferenceImportFailure[],
): ReferenceImportParseResult {
  return { errors, rows: [], totalRows: 0, truncated: false };
}
