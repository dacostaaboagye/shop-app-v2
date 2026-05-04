import type {
  StockTakeDryRunPreviewRow,
  StockTakeDryRunRowError,
  StockTakeImportDryRunRequest,
  StockTakeImportDryRunResponse,
} from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import type {
  PostgresStockTakeImportRepository,
  StockTakeImportLine,
} from "./postgres-stock-take-import.repository.js";
import {
  addDuplicateErrors,
  addMatchErrors,
  addMissingCatalogLineErrors,
  buildDryRunSummary,
  normalizeSku,
} from "./stock-take-import.service-support.js";
import {
  type ParsedStockTakeImportRow,
  parseStockTakeImportCsv,
} from "./stock-take-import-parser.js";

type StockTakeImportRepository = Pick<
  PostgresStockTakeImportRepository,
  "getSnapshot"
>;

export class StockTakeImportService {
  constructor(private readonly repository: StockTakeImportRepository) {}

  async dryRun(input: {
    reference: string;
    request: StockTakeImportDryRunRequest;
  }): Promise<StockTakeImportDryRunResponse> {
    const snapshot = await this.repository.getSnapshot(input.reference);
    if (!snapshot) throw stockTakeNotFound(input.reference);
    if (snapshot.session.status === "applied") {
      throw stockTakeConflict(input.reference, "already applied");
    }
    if (snapshot.session.status === "cancelled") {
      throw stockTakeConflict(input.reference, "cancelled");
    }

    const parsed = parseStockTakeImportCsv(input.request.csv);
    const lineBySku = new Map(
      snapshot.lines.map((line) => [normalizeSku(line.sku), line]),
    );
    const lineByNumber = new Map(
      snapshot.lines.map((line) => [line.lineNumber, line]),
    );
    const rowErrors = [...parsed.errors];
    const seenSkus = new Map<string, number>();
    const seenLines = new Map<number, number>();
    const rows = parsed.rows.map((row) =>
      buildPreviewRow({
        lineByNumber,
        lineBySku,
        row,
        rowErrors,
        seenLines,
        seenSkus,
      }),
    );
    addMissingCatalogLineErrors({
      lines: snapshot.lines,
      message: "Every generated catalog SKU line must be counted before apply.",
      rowErrors,
      rows: parsed.rows,
    });
    const invalidRowNumbers = new Set(
      rowErrors.map((error) => error.rowNumber),
    );
    const previewRows = rows.map((row) =>
      invalidRowNumbers.has(row.rowNumber) &&
      row.status !== "manual_unsupported"
        ? { ...row, status: "invalid" as const }
        : row,
    );

    return {
      canApply: rowErrors.length === 0 && previewRows.length > 0,
      errors: rowErrors,
      locationName: snapshot.session.locationName,
      locationSlug: snapshot.session.locationSlug,
      rows: previewRows,
      status: snapshot.session.status,
      stockTakeReference: snapshot.session.reference,
      summary: buildDryRunSummary(previewRows, rowErrors, parsed.totalRows),
    };
  }
}

function buildPreviewRow(input: {
  lineByNumber: Map<number, StockTakeImportLine>;
  lineBySku: Map<string, StockTakeImportLine>;
  row: ParsedStockTakeImportRow;
  rowErrors: StockTakeDryRunRowError[];
  seenLines: Map<number, number>;
  seenSkus: Map<string, number>;
}): StockTakeDryRunPreviewRow {
  const normalizedSku = normalizeSku(input.row.sku);
  const matchedLine = input.lineBySku.get(normalizedSku);
  const lineAtNumber =
    input.row.lineNumber == null
      ? undefined
      : input.lineByNumber.get(input.row.lineNumber);

  addDuplicateErrors(input);
  addMatchErrors(input, matchedLine, lineAtNumber);

  const line = matchedLine ?? lineAtNumber;
  const shouldMaskQuantities = line?.mode === "blind";
  const variance =
    shouldMaskQuantities || input.row.countedQuantity == null || !matchedLine
      ? null
      : input.row.countedQuantity - matchedLine.systemOnHand;

  return {
    availableQuantity:
      line && !shouldMaskQuantities ? line.availableQuantity : null,
    countedQuantity: input.row.countedQuantity,
    lineNumber: input.row.lineNumber,
    note: input.row.note,
    productName: line?.productName ?? "",
    reservedQuantity:
      line && !shouldMaskQuantities ? line.reservedQuantity : null,
    rowNumber: input.row.rowNumber,
    sku: input.row.sku,
    status:
      matchedLine?.rowStatus === "manual_blank"
        ? "manual_unsupported"
        : "valid",
    systemOnHand: line && !shouldMaskQuantities ? line.systemOnHand : null,
    variance,
    variantName: line?.variantName ?? "",
  };
}

function stockTakeNotFound(reference: string): AppError {
  return new AppError({
    code: "not_found",
    detail: `Stock take "${reference}" was not found.`,
    statusCode: 404,
    title: "Stock take not found",
  });
}

function stockTakeConflict(reference: string, state: string): AppError {
  return new AppError({
    code: "conflict",
    detail: `Stock take "${reference}" is ${state} and cannot be dry-run.`,
    statusCode: 409,
    title: "Stock take unavailable",
  });
}
