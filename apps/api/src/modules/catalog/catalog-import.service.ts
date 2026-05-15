import { randomUUID } from "node:crypto";
import type {
  CatalogImportJobResponse,
  CatalogImportReportResponse,
  CatalogImportRowError,
  CatalogImportUploadResponse,
} from "@shop/contracts";
import {
  type CatalogImportFailedRow,
  type CatalogImportRepository,
  toJobResponse,
  toReportResponse,
} from "./catalog-import.repository.js";
import {
  DEFAULT_CATALOG_IMPORT_MAX_ROWS,
  parseCatalogImportCsv,
  parseCatalogImportOriginalRows,
} from "./catalog-import-parser.js";
import {
  type CatalogImportValidRow,
  failedFromError,
  failureMessage,
  parserFailures,
  rowError,
  toProductPayload,
  toVariantPayload,
} from "./catalog-import-row-results.js";
import {
  type CatalogImportProcessScheduler,
  scheduleCatalogImportProcess,
} from "./catalog-import-scheduler.js";
import type { CatalogProductWriteService } from "./catalog-product-write.service.js";

type Actor = { userId: string; userSlug: string };

export class CatalogImportService {
  constructor(
    private readonly repository: CatalogImportRepository,
    private readonly productWriteService: CatalogProductWriteService,
    private readonly maxRows = DEFAULT_CATALOG_IMPORT_MAX_ROWS,
    private readonly processScheduler: CatalogImportProcessScheduler = scheduleCatalogImportProcess,
  ) {}

  async startImport(input: {
    actor: Actor;
    contentType: string;
    csv: string;
    fileName: string;
    now: Date;
  }): Promise<CatalogImportUploadResponse> {
    const job = await this.repository.createQueued({
      actorId: input.actor.userId,
      contentType: input.contentType,
      csv: input.csv,
      fileName: input.fileName,
      jobReference: createJobReference(),
      maxRows: this.maxRows,
      now: input.now,
    });

    this.processScheduler(() =>
      this.processJob(job.jobReference, input.actor, input.now).then(
        () => undefined,
      ),
    );

    return {
      acceptedAt: input.now.toISOString(),
      fileName: job.fileName,
      jobReference: job.jobReference,
      maxRows: this.maxRows,
      status: job.status,
    };
  }

  async getJob(reference: string): Promise<CatalogImportJobResponse | null> {
    const job = await this.repository.findByReference(reference);
    return job ? toJobResponse(job) : null;
  }

  async getReport(
    reference: string,
  ): Promise<CatalogImportReportResponse | null> {
    const job = await this.repository.findByReference(reference);
    return job ? toReportResponse(job) : null;
  }

  private async processJob(reference: string, actor: Actor, now: Date) {
    const job = await this.repository.findByReference(reference);
    if (!job) throw new Error(`Catalog import job ${reference} was not found.`);

    await this.repository.markProcessing({
      jobReference: reference,
      maxRows: this.maxRows,
      startedAt: now,
    });

    try {
      const parsed = parseCatalogImportCsv(job.rawCsv, {
        maxRows: this.maxRows,
      });
      const originalRows = parseCatalogImportOriginalRows(job.rawCsv);
      const failedRows = parserFailures(parsed.errors, originalRows);
      const validRows = await this.rejectExistingCatalogCodes(
        parsed.validRows,
        originalRows,
      );
      failedRows.push(...validRows.failedRows);

      let importedRows = 0;
      const productSlugs = new Map<string, string>();

      for (const row of validRows.rows) {
        try {
          await this.importRow(actor, row, now, productSlugs);
          importedRows += 1;
        } catch (error) {
          if (error instanceof CatalogImportCompensationError) throw error;
          failedRows.push(
            failedFromError(
              row.rowNumber,
              error,
              originalRows.get(row.rowNumber) ?? {},
            ),
          );
        }
      }

      return this.repository.updateResult({
        completedAt: now,
        failedRows,
        importedRows,
        jobReference: reference,
        maxRows: this.maxRows,
        status: failedRows.length > 0 ? "completed_with_errors" : "completed",
        totalRows: parsed.summary.totalRows,
      });
    } catch (error) {
      await this.repository.markFailed({
        completedAt: now,
        failureReason: failureMessage(error),
        jobReference: reference,
        maxRows: this.maxRows,
      });
      throw error;
    }
  }

  private async createProduct(actor: Actor, row: ImportRow, now: Date) {
    return this.productWriteService.createProduct(
      actor,
      toProductPayload(row),
      now,
    );
  }

  private async importRow(
    actor: Actor,
    row: ImportRow,
    now: Date,
    productSlugs: Map<string, string>,
  ): Promise<void> {
    let createdProductSlug: string | null = null;
    try {
      const existingProductSlug = productSlugs.get(row.productName);
      const productSlug =
        existingProductSlug ?? (await this.createProduct(actor, row, now)).slug;
      createdProductSlug = existingProductSlug ? null : productSlug;
      await this.productWriteService.createVariant(
        actor,
        productSlug,
        toVariantPayload(row),
        now,
      );
      productSlugs.set(row.productName, productSlug);
    } catch (error) {
      if (createdProductSlug) {
        try {
          await this.productWriteService.deleteProductWithActor(
            actor,
            createdProductSlug,
            now,
          );
        } catch (compensationError) {
          throw new CatalogImportCompensationError(compensationError);
        }
      }
      throw error;
    }
  }

  private async rejectExistingCatalogCodes(
    rows: ImportRow[],
    originalRows: Map<number, Record<string, string>>,
  ) {
    const existingSkus = await this.repository.findExistingSkus(
      rows.map((row) => row.sku),
    );
    const existingBarcodes = await this.repository.findExistingBarcodes(
      rows.flatMap((row) => (row.barcode ? [row.barcode] : [])),
    );
    const failedRows: CatalogImportFailedRow[] = [];
    const accepted: ImportRow[] = [];

    for (const row of rows) {
      const errors: CatalogImportRowError[] = [];
      if (existingSkus.has(row.sku)) {
        errors.push(
          rowError(
            row.rowNumber,
            "duplicate_sku",
            "SKU already exists.",
            "sku",
          ),
        );
      }
      if (row.barcode && existingBarcodes.has(row.barcode)) {
        errors.push(
          rowError(
            row.rowNumber,
            "duplicate_barcode",
            "Barcode already exists.",
            "barcode",
          ),
        );
      }
      if (errors.length > 0)
        failedRows.push({
          errors,
          originalRow: originalRows.get(row.rowNumber) ?? {},
          rowNumber: row.rowNumber,
        });
      else accepted.push(row);
    }

    return { failedRows, rows: accepted };
  }
}

type ImportRow = CatalogImportValidRow;

class CatalogImportCompensationError extends Error {
  constructor(cause: unknown) {
    super(`Catalog import compensation failed: ${failureMessage(cause)}`);
  }
}

function createJobReference(): string {
  return `CIMP-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}
