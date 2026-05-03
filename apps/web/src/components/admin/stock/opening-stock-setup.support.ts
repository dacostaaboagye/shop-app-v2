import type { AdminOpeningStockRequest } from "@shop/contracts";
import { ApiError } from "@/lib/errors/app-error";

export const MAX_OPENING_STOCK_ROWS = 1000;

export type OpeningStockParsedRow = {
  errors: string[];
  lineNumber: number;
  onHandQuantity: number | null;
  sku: string;
};

export function parseOpeningStockRows(input: string): OpeningStockParsedRow[] {
  const duplicateTracker = new Map<string, OpeningStockParsedRow[]>();
  const rows = input
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter(({ line }) => line.length > 0)
    .map(({ line, lineNumber }) => {
      const [sku = "", quantity = ""] = splitOpeningStockLine(line);
      const row: OpeningStockParsedRow = {
        errors: [],
        lineNumber,
        onHandQuantity: parseOpeningQuantity(quantity),
        sku: sku.trim(),
      };

      if (!row.sku) row.errors.push("Enter a SKU.");
      if (row.sku.length > 120) row.errors.push("SKU is too long.");
      if (row.onHandQuantity === null) {
        row.errors.push("Quantity must be a non-negative whole number.");
      }

      const key = row.sku.toUpperCase();
      if (key) {
        duplicateTracker.set(key, [...(duplicateTracker.get(key) ?? []), row]);
      }

      return row;
    });

  for (const duplicates of duplicateTracker.values()) {
    if (duplicates.length <= 1) continue;
    for (const row of duplicates) {
      row.errors.push("Duplicate SKU in this batch.");
    }
  }

  return rows;
}

export function buildOpeningStockRequest(input: {
  locationSlug: string;
  note: string;
  rows: ReadonlyArray<OpeningStockParsedRow>;
  sourceReference: string;
  sourceType: AdminOpeningStockRequest["sourceType"];
}): AdminOpeningStockRequest {
  return {
    lines: input.rows.map((row) => ({
      note: undefined,
      onHandQuantity: row.onHandQuantity ?? 0,
      sku: row.sku,
    })),
    locationSlug: input.locationSlug,
    note: input.note.trim() || undefined,
    sourceReference: input.sourceReference.trim() || undefined,
    sourceType: input.sourceType,
  };
}

export function getOpeningStockReadyRows(
  rows: ReadonlyArray<OpeningStockParsedRow>,
) {
  return rows.filter((row) => row.errors.length === 0);
}

export function getOpeningStockServerRowErrors(error: unknown) {
  if (!(error instanceof ApiError)) return [];
  const lines = error.problem?.details?.lines;
  if (!Array.isArray(lines)) return [];

  return lines.flatMap((line) => {
    if (!line || typeof line !== "object") return [];
    const record = line as {
      index?: unknown;
      message?: unknown;
      reason?: unknown;
      sku?: unknown;
    };
    if (typeof record.message !== "string") return [];

    return [
      {
        index: typeof record.index === "number" ? record.index : null,
        message: record.message,
        reason: typeof record.reason === "string" ? record.reason : "blocked",
        sku: typeof record.sku === "string" ? record.sku : null,
      },
    ];
  });
}

export function getOpeningStockVisibleReviewRows(input: {
  rows: ReadonlyArray<OpeningStockParsedRow>;
  serverErrors: ReturnType<typeof getOpeningStockServerRowErrors>;
}) {
  return input.rows
    .map((row, index) => ({ index, row }))
    .filter(({ index, row }) => {
      if (index < 100) return true;
      return input.serverErrors.some(
        (error) =>
          error.index === index ||
          error.sku?.toUpperCase() === row.sku.toUpperCase(),
      );
    });
}

function splitOpeningStockLine(line: string): [string, string] {
  const delimiter = line.includes(",")
    ? ","
    : line.includes("\t")
      ? "\t"
      : null;
  const [sku = "", quantity = ""] =
    delimiter === null ? line.split(/\s+/) : line.split(delimiter);
  return [sku, quantity];
}

function parseOpeningQuantity(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}
