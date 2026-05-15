import type {
  CatalogImportJobResponse,
  CatalogImportParseSummary,
  CatalogImportReportResponse,
  CatalogImportRowError,
} from "@shop/contracts";
import { catalogImportJobs, productVariants } from "@shop/database";
import { eq, inArray } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export type CatalogImportFailedRow = {
  errors: CatalogImportRowError[];
  originalRow: Record<string, string>;
  rowNumber: number;
};

export type CatalogImportJobRecord = {
  completedAt: Date | null;
  createdAt: Date;
  fileName: string;
  jobReference: string;
  maxRows: number;
  rawCsv: string;
  status:
    | "queued"
    | "processing"
    | "completed"
    | "completed_with_errors"
    | "failed";
  summary: CatalogImportParseSummary;
  failureReason: string | null;
  failedRows: CatalogImportFailedRow[];
};

export type CatalogImportRepository = {
  createQueued(input: {
    actorId: string;
    contentType: string;
    csv: string;
    fileName: string;
    jobReference: string;
    maxRows: number;
    now: Date;
  }): Promise<CatalogImportJobRecord>;
  findByReference(reference: string): Promise<CatalogImportJobRecord | null>;
  findExistingBarcodes(barcodes: string[]): Promise<Set<string>>;
  findExistingSkus(skus: string[]): Promise<Set<string>>;
  markFailed(input: {
    completedAt: Date;
    failureReason: string;
    jobReference: string;
    maxRows: number;
  }): Promise<CatalogImportJobRecord>;
  markProcessing(input: {
    jobReference: string;
    maxRows: number;
    startedAt: Date;
  }): Promise<CatalogImportJobRecord>;
  updateResult(input: {
    completedAt: Date;
    failedRows: CatalogImportFailedRow[];
    importedRows: number;
    jobReference: string;
    maxRows: number;
    status: CatalogImportJobRecord["status"];
    totalRows: number;
  }): Promise<CatalogImportJobRecord>;
};

export class PostgresCatalogImportRepository
  implements CatalogImportRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async createQueued(
    input: Parameters<CatalogImportRepository["createQueued"]>[0],
  ) {
    const [row] = await this.db
      .insert(catalogImportJobs)
      .values({
        contentType: input.contentType,
        createdAt: input.now,
        originalFileName: input.fileName,
        rawCsv: input.csv,
        reference: input.jobReference,
        status: "queued",
        updatedAt: input.now,
        uploadedBy: input.actorId,
      })
      .returning();
    if (!row) throw new Error("Unable to create catalog import job.");
    return toRecord(row, input.maxRows);
  }

  async findByReference(reference: string) {
    const [row] = await this.db
      .select()
      .from(catalogImportJobs)
      .where(eq(catalogImportJobs.reference, reference))
      .limit(1);
    return row ? toRecord(row, 1_000) : null;
  }

  async findExistingBarcodes(barcodes: string[]): Promise<Set<string>> {
    if (barcodes.length === 0) return new Set();
    const rows = await this.db
      .select({ barcode: productVariants.barcode })
      .from(productVariants)
      .where(inArray(productVariants.barcode, barcodes));
    return new Set(rows.flatMap((row) => (row.barcode ? [row.barcode] : [])));
  }

  async findExistingSkus(skus: string[]): Promise<Set<string>> {
    if (skus.length === 0) return new Set();
    const rows = await this.db
      .select({ sku: productVariants.sku })
      .from(productVariants)
      .where(inArray(productVariants.sku, skus));
    return new Set(rows.map((row) => row.sku));
  }

  async markFailed(
    input: Parameters<CatalogImportRepository["markFailed"]>[0],
  ) {
    const [row] = await this.db
      .update(catalogImportJobs)
      .set({
        completedAt: input.completedAt,
        failureReason: input.failureReason,
        status: "failed",
        updatedAt: input.completedAt,
      })
      .where(eq(catalogImportJobs.reference, input.jobReference))
      .returning();
    if (!row) throw new Error("Unable to fail catalog import job.");
    return toRecord(row, input.maxRows);
  }

  async markProcessing(
    input: Parameters<CatalogImportRepository["markProcessing"]>[0],
  ) {
    const [row] = await this.db
      .update(catalogImportJobs)
      .set({
        startedAt: input.startedAt,
        status: "processing",
        updatedAt: input.startedAt,
      })
      .where(eq(catalogImportJobs.reference, input.jobReference))
      .returning();
    if (!row) throw new Error("Unable to start catalog import job.");
    return toRecord(row, input.maxRows);
  }

  async updateResult(
    input: Parameters<CatalogImportRepository["updateResult"]>[0],
  ) {
    const [row] = await this.db
      .update(catalogImportJobs)
      .set({
        completedAt: input.completedAt,
        errorReport: input.failedRows,
        failedRows: input.failedRows.length,
        failureReason: null,
        importedRows: input.importedRows,
        status: input.status,
        totalRows: input.totalRows,
        updatedAt: input.completedAt,
      })
      .where(eq(catalogImportJobs.reference, input.jobReference))
      .returning();
    if (!row) throw new Error("Unable to update catalog import job.");
    return toRecord(row, input.maxRows);
  }
}

export function toJobResponse(
  record: CatalogImportJobRecord,
): CatalogImportJobResponse {
  return {
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    fileName: record.fileName,
    jobReference: record.jobReference,
    reportAvailable: record.failedRows.length > 0,
    status: record.status,
    summary: record.summary,
  };
}

export function toReportResponse(
  record: CatalogImportJobRecord,
): CatalogImportReportResponse {
  return {
    failedRows: record.failedRows,
    generatedAt: new Date().toISOString(),
    jobReference: record.jobReference,
    summary: record.summary,
  };
}

function toRecord(
  row: typeof catalogImportJobs.$inferSelect,
  maxRows: number,
): CatalogImportJobRecord {
  return {
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    failedRows: row.errorReport as CatalogImportFailedRow[],
    failureReason: row.failureReason,
    fileName: row.originalFileName,
    jobReference: row.reference,
    maxRows,
    rawCsv: row.rawCsv,
    status: row.status,
    summary: {
      invalidRows: row.failedRows,
      maxRows,
      totalRows: row.totalRows,
      truncated: row.totalRows > maxRows,
      validRows: row.importedRows,
    },
  };
}
