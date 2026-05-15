import type { AdminOpeningStockRequest } from "@shop/contracts";
import { ApiError } from "@/lib/errors/app-error";

export const MAX_OPENING_STOCK_ROWS = 1000;

export type OpeningStockParsedRow = {
  errors: string[];
  lineNumber: number;
  onHandQuantity: number | null;
  sku: string;
};

export type OpeningStockFormValues = {
  note: string;
  quantityEntry: string;
  rawRows: string;
  skuEntry: string;
  sourceReference: string;
  sourceType: AdminOpeningStockRequest["sourceType"];
};

export function appendOpeningStockRow(input: {
  currentRows: string;
  quantity: string;
  sku: string;
}) {
  const sku = input.sku.trim();
  const quantity = input.quantity.trim();
  if (!canAppendOpeningStockRow({ quantity, sku })) return input.currentRows;

  return [...formatOpeningStockRows(input.currentRows), `${sku},${quantity}`]
    .filter(Boolean)
    .join("\n");
}

export function upsertOpeningStockRow(input: {
  currentRows: string;
  quantity: string;
  sku: string;
}) {
  const sku = input.sku.trim();
  const quantity = input.quantity.trim();
  if (!canAppendOpeningStockRow({ quantity, sku })) return input.currentRows;

  const rows = parseOpeningStockRows(input.currentRows);
  const targetKey = sku.toUpperCase();
  const nextRows = rows.some((row) => row.sku.toUpperCase() === targetKey)
    ? rows.map((row) =>
        row.sku.toUpperCase() === targetKey
          ? `${row.sku},${quantity}`
          : `${row.sku},${row.onHandQuantity ?? ""}`,
      )
    : [...formatOpeningStockRows(input.currentRows), `${sku},${quantity}`];

  return nextRows.filter(Boolean).join("\n");
}

export function canAppendOpeningStockRow(input: {
  quantity: string;
  sku: string;
}) {
  return input.sku.trim().length > 0 && /^\d+$/.test(input.quantity.trim());
}

export function isOpeningStockSkuInRows(input: {
  rows: ReadonlyArray<OpeningStockParsedRow>;
  sku: string;
}) {
  const sku = input.sku.trim().toUpperCase();
  return input.rows.some((row) => row.sku.toUpperCase() === sku);
}

export function hasOpeningStockDraft(input: { quantity: string; sku: string }) {
  return input.sku.trim().length > 0 || input.quantity.trim().length > 0;
}

export function removeOpeningStockRow(input: {
  index: number;
  rows: ReadonlyArray<OpeningStockParsedRow>;
}) {
  return input.rows
    .filter((_, index) => index !== input.index)
    .map((row) => `${row.sku},${row.onHandQuantity ?? ""}`)
    .join("\n");
}

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

export type OpeningStockServerRowError = ReturnType<
  typeof getOpeningStockServerRowErrors
>[number];

export function isOpeningStockServerErrorForRow(input: {
  error: OpeningStockServerRowError;
  index: number;
  row: OpeningStockParsedRow;
}) {
  if (input.error.sku) {
    return input.error.sku.toUpperCase() === input.row.sku.toUpperCase();
  }

  return input.error.index === input.index;
}

export function getOpeningStockVisibleReviewRows(input: {
  rows: ReadonlyArray<OpeningStockParsedRow>;
  serverErrors: ReturnType<typeof getOpeningStockServerRowErrors>;
}) {
  return input.rows
    .map((row, index) => ({ index, row }))
    .filter(({ index, row }) => {
      if (index < 100) return true;
      return input.serverErrors.some((error) =>
        isOpeningStockServerErrorForRow({ error, index, row }),
      );
    });
}

export function getOpeningStockServerBlockedRowCount(input: {
  rows: ReadonlyArray<OpeningStockParsedRow>;
  serverErrors: ReturnType<typeof getOpeningStockServerRowErrors>;
}) {
  return input.rows.filter((row, index) =>
    input.serverErrors.some((error) =>
      isOpeningStockServerErrorForRow({ error, index, row }),
    ),
  ).length;
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

function formatOpeningStockRows(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseOpeningQuantity(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}
