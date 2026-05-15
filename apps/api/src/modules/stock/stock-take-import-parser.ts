import type {
  StockTakeDryRunField,
  StockTakeDryRunRowError,
} from "@shop/contracts";
import {
  parseStockTakeCsvRecords,
  type StockTakeCsvRecord,
} from "./stock-take-import-csv.js";

const REQUIRED_COLUMNS = ["lineNumber", "sku", "countedQuantity"] as const;
const OPTIONAL_COLUMNS = ["notes", "note"] as const;
const SUPPORTED_COLUMNS = new Set<string>([
  ...REQUIRED_COLUMNS,
  ...OPTIONAL_COLUMNS,
  "availableQuantity",
  "productName",
  "reservedQuantity",
  "systemOnHand",
  "unitOfMeasure",
  "variance",
  "variantName",
]);

export type ParsedStockTakeImportRow = {
  countedQuantity: number | null;
  lineNumber: number | null;
  note: string | null;
  rowNumber: number;
  sku: string;
};

export type StockTakeImportParseResult = {
  errors: StockTakeDryRunRowError[];
  rows: ParsedStockTakeImportRow[];
  totalRows: number;
};

type RowMap = Record<string, string>;

export function parseStockTakeImportCsv(
  csvText: string,
): StockTakeImportParseResult {
  const parsed = parseStockTakeCsvRecords(csvText);
  if (parsed.error) {
    return {
      errors: [
        rowError({
          code: "malformed_csv",
          message: parsed.error.message,
          rowNumber: parsed.error.rowNumber,
        }),
      ],
      rows: [],
      totalRows: 0,
    };
  }

  const records = parsed.records.filter((record) =>
    record.values.some((value) => value.trim().length > 0),
  );
  const header = records[0]?.values.map((value) => value.trim()) ?? [];
  const headerErrors = getHeaderErrors(header);
  if (records.length === 0 || headerErrors.length > 0) {
    return { errors: headerErrors, rows: [], totalRows: 0 };
  }

  const rows: ParsedStockTakeImportRow[] = [];
  const errors: StockTakeDryRunRowError[] = [];

  for (const record of records.slice(1)) {
    const row = toRowMap(header, record.values);
    errors.push(...getShapeErrors(record, header));
    rows.push({
      countedQuantity: quantity(row.countedQuantity, record.rowNumber, errors),
      lineNumber: lineNumber(row.lineNumber, record.rowNumber, errors),
      note: optionalText(row.notes || row.note),
      rowNumber: record.rowNumber,
      sku: clean(row.sku),
    });

    if (!clean(row.sku)) {
      errors.push(
        rowError({
          code: "missing_required",
          field: "sku",
          message: "SKU is required.",
          rowNumber: record.rowNumber,
        }),
      );
    }
  }

  return { errors, rows, totalRows: rows.length };
}

function getHeaderErrors(header: string[]): StockTakeDryRunRowError[] {
  if (header.length === 0) {
    return [
      rowError({
        code: "malformed_csv",
        message: "CSV header row is required.",
        rowNumber: 1,
      }),
    ];
  }

  return [
    ...REQUIRED_COLUMNS.filter((column) => !header.includes(column)).map(
      (column) =>
        rowError({
          code: "missing_required",
          field: column as StockTakeDryRunField,
          message: `${column} is required.`,
          rowNumber: 1,
        }),
    ),
    ...header
      .filter((column) => column.length > 0 && !SUPPORTED_COLUMNS.has(column))
      .map((column) =>
        rowError({
          code: "malformed_csv",
          message: `Unsupported column "${column}".`,
          rowNumber: 1,
        }),
      ),
  ];
}

function getShapeErrors(
  record: StockTakeCsvRecord,
  header: string[],
): StockTakeDryRunRowError[] {
  if (record.values.length === header.length) return [];

  return [
    rowError({
      code: "malformed_csv",
      message: "Row has a different number of columns than the header.",
      rowNumber: record.rowNumber,
    }),
  ];
}

function quantity(
  value: string | undefined,
  rowNumber: number,
  errors: StockTakeDryRunRowError[],
) {
  const trimmed = clean(value);
  if (!trimmed) {
    errors.push(
      rowError({
        code: "missing_required",
        field: "countedQuantity",
        message: "Counted quantity is required.",
        rowNumber,
      }),
    );
    return null;
  }
  if (!/^\d+$/.test(trimmed)) {
    errors.push(
      rowError({
        code: "invalid_quantity",
        field: "countedQuantity",
        message: "Counted quantity must be a non-negative whole number.",
        rowNumber,
      }),
    );
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed)) {
    errors.push(
      rowError({
        code: "invalid_quantity",
        field: "countedQuantity",
        message: "Counted quantity is too large.",
        rowNumber,
      }),
    );
    return null;
  }
  return parsed;
}

function lineNumber(
  value: string | undefined,
  rowNumber: number,
  errors: StockTakeDryRunRowError[],
) {
  const trimmed = clean(value);
  if (!trimmed || !/^\d+$/.test(trimmed) || Number(trimmed) < 1) {
    errors.push(
      rowError({
        code: "missing_required",
        field: "lineNumber",
        message: "Line number must be a positive whole number.",
        rowNumber,
      }),
    );
    return null;
  }
  return Number(trimmed);
}

function toRowMap(header: string[], values: string[]): RowMap {
  return Object.fromEntries(
    header.map((column, index) => [column, values[index]?.trim() ?? ""]),
  );
}

function rowError(input: StockTakeDryRunRowError): StockTakeDryRunRowError {
  return input;
}

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

function optionalText(value: string | undefined) {
  const trimmed = clean(value);
  return trimmed ? trimmed : null;
}
