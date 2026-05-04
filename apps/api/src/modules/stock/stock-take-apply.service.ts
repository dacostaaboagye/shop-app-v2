import type {
  StockTakeApplyRequest,
  StockTakeApplyResponse,
  StockTakeDryRunRowError,
} from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import type { PostgresStockTakeApplyRepository } from "./postgres-stock-take-apply.repository.js";
import type {
  PostgresStockTakeImportRepository,
  StockTakeImportLine,
} from "./postgres-stock-take-import.repository.js";
import {
  addDuplicateErrors,
  addMatchErrors,
  addMissingCatalogLineErrors,
  normalizeSku,
} from "./stock-take-import.service-support.js";
import {
  type ParsedStockTakeImportRow,
  parseStockTakeImportCsv,
} from "./stock-take-import-parser.js";

type StockTakeApplyRepository = Pick<PostgresStockTakeApplyRepository, "apply">;
type StockTakeImportRepository = Pick<
  PostgresStockTakeImportRepository,
  "getSnapshot"
>;

export class StockTakeApplyService {
  constructor(
    private readonly applyRepository: StockTakeApplyRepository,
    private readonly importRepository: StockTakeImportRepository,
  ) {}

  async apply(input: {
    appliedBy?: string;
    appliedBySlug?: string;
    reference: string;
    request: StockTakeApplyRequest;
  }): Promise<StockTakeApplyResponse> {
    const snapshot = await this.importRepository.getSnapshot(input.reference);
    if (!snapshot) throw stockTakeApplyNotFound(input.reference);
    const parsed = parseStockTakeImportCsv(input.request.csv);
    const errors = validateApplyRows(
      snapshot.lines,
      parsed.rows,
      parsed.errors,
    );
    if (errors.length > 0) throw stockTakeApplyValidationError(errors);

    return this.applyRepository.apply({
      ...(input.appliedBy ? { appliedBy: input.appliedBy } : {}),
      ...(input.appliedBySlug ? { appliedBySlug: input.appliedBySlug } : {}),
      reference: input.reference,
      rows: parsed.rows,
    });
  }
}

function validateApplyRows(
  lines: StockTakeImportLine[],
  rows: ParsedStockTakeImportRow[],
  parseErrors: StockTakeDryRunRowError[],
): StockTakeDryRunRowError[] {
  const lineBySku = new Map(
    lines.map((line) => [normalizeSku(line.sku), line]),
  );
  const lineByNumber = new Map(lines.map((line) => [line.lineNumber, line]));
  const rowErrors = [...parseErrors];
  const seenSkus = new Map<string, number>();
  const seenLines = new Map<number, number>();
  const catalogLines = lines.filter(
    (line) => line.rowStatus !== "manual_blank",
  );

  if (catalogLines.length === 0) {
    rowErrors.push({
      code: "missing_line",
      field: "lineNumber",
      message: "This stock-take has no generated catalog SKU lines to apply.",
      rowNumber: 1,
    });
  }

  for (const row of rows) {
    const matchedLine = lineBySku.get(normalizeSku(row.sku));
    const lineAtNumber =
      row.lineNumber == null ? undefined : lineByNumber.get(row.lineNumber);

    addDuplicateErrors({ row, rowErrors, seenLines, seenSkus });
    addMatchErrors({ row, rowErrors }, matchedLine, lineAtNumber);
  }

  addMissingCatalogLineErrors({
    lines,
    message: "Every generated catalog SKU line must be counted before apply.",
    rowErrors,
    rows,
  });

  return rowErrors;
}

function stockTakeApplyValidationError(
  errors: StockTakeDryRunRowError[],
): AppError {
  return new AppError({
    code: "validation_error",
    detail: "The stock-take CSV has validation errors and cannot be applied.",
    details: { errors },
    statusCode: 400,
    title: "Stock take apply validation failed",
  });
}

function stockTakeApplyNotFound(reference: string): AppError {
  return new AppError({
    code: "not_found",
    detail: `Stock take "${reference}" was not found.`,
    statusCode: 404,
    title: "Stock take not found",
  });
}
