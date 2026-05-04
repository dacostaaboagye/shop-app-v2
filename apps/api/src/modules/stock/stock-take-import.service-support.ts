import type {
  StockTakeDryRunErrorCode,
  StockTakeDryRunField,
  StockTakeDryRunPreviewRow,
  StockTakeDryRunRowError,
} from "@shop/contracts";
import type { StockTakeImportLine } from "./postgres-stock-take-import.repository.js";
import type { ParsedStockTakeImportRow } from "./stock-take-import-parser.js";

export function addDuplicateErrors(input: {
  row: ParsedStockTakeImportRow;
  rowErrors: StockTakeDryRunRowError[];
  seenLines: Map<number, number>;
  seenSkus: Map<string, number>;
}) {
  const skuKey = normalizeSku(input.row.sku);
  if (skuKey) {
    const firstSkuRow = input.seenSkus.get(skuKey);
    if (firstSkuRow) {
      input.rowErrors.push(
        error(
          input.row,
          "duplicate_sku",
          `SKU duplicates row ${firstSkuRow}.`,
          "sku",
        ),
      );
    } else {
      input.seenSkus.set(skuKey, input.row.rowNumber);
    }
  }

  if (input.row.lineNumber) {
    const firstLineRow = input.seenLines.get(input.row.lineNumber);
    if (firstLineRow) {
      input.rowErrors.push(
        error(
          input.row,
          "duplicate_line",
          `Line number duplicates row ${firstLineRow}.`,
          "lineNumber",
        ),
      );
    } else {
      input.seenLines.set(input.row.lineNumber, input.row.rowNumber);
    }
  }
}

export function addMatchErrors(
  input: {
    row: ParsedStockTakeImportRow;
    rowErrors: StockTakeDryRunRowError[];
  },
  matchedLine: StockTakeImportLine | undefined,
  lineAtNumber: StockTakeImportLine | undefined,
) {
  if (!matchedLine && input.row.sku) {
    input.rowErrors.push(
      error(
        input.row,
        "unknown_sku",
        "SKU is not part of this stock-take session.",
        "sku",
      ),
    );
  }
  if (matchedLine?.rowStatus === "manual_blank") {
    input.rowErrors.push(
      error(
        input.row,
        "manual_row_unsupported",
        "Manual blank rows cannot be reconciled in this dry run.",
        "sku",
      ),
    );
  }
  if (matchedLine && input.row.lineNumber && !lineAtNumber) {
    input.rowErrors.push(
      error(
        input.row,
        "line_sku_mismatch",
        "Line number is not part of the generated stock-take sheet.",
        "lineNumber",
      ),
    );
  }
  if (
    matchedLine &&
    lineAtNumber &&
    normalizeSku(matchedLine.sku) !== normalizeSku(lineAtNumber.sku)
  ) {
    input.rowErrors.push(
      error(
        input.row,
        "line_sku_mismatch",
        "Line number and SKU do not match the generated stock-take sheet.",
        "lineNumber",
      ),
    );
  }
}

export function normalizeSku(sku: string) {
  return sku.trim().toLowerCase();
}

export function buildDryRunSummary(
  rows: StockTakeDryRunPreviewRow[],
  errors: StockTakeDryRunRowError[],
  totalRows: number,
) {
  const invalidRows = new Set(errors.map((errorItem) => errorItem.rowNumber));
  const validRows = rows.filter((row) => !invalidRows.has(row.rowNumber));

  return {
    duplicateRows:
      countRowsByCode(errors, "duplicate_sku") +
      countRowsByCode(errors, "duplicate_line"),
    invalidRows: invalidRows.size,
    totalNegativeVariance: validRows.reduce(
      (sum, row) => sum + Math.min(row.variance ?? 0, 0),
      0,
    ),
    totalPositiveVariance: validRows.reduce(
      (sum, row) => sum + Math.max(row.variance ?? 0, 0),
      0,
    ),
    totalRows,
    unknownRows: countRowsByCode(errors, "unknown_sku"),
    validRows: validRows.length,
    varianceRows: validRows.filter((row) => (row.variance ?? 0) !== 0).length,
  };
}

function countRowsByCode(
  errors: StockTakeDryRunRowError[],
  code: StockTakeDryRunErrorCode,
) {
  return new Set(
    errors
      .filter((errorItem) => errorItem.code === code)
      .map((errorItem) => errorItem.rowNumber),
  ).size;
}

function error(
  row: ParsedStockTakeImportRow,
  code: StockTakeDryRunErrorCode,
  message: string,
  field?: StockTakeDryRunField,
): StockTakeDryRunRowError {
  return {
    code,
    ...(field ? { field } : {}),
    ...(row.lineNumber ? { lineNumber: row.lineNumber } : {}),
    message,
    rowNumber: row.rowNumber,
    ...(row.sku ? { sku: row.sku } : {}),
  };
}
