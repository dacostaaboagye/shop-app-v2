import type {
  AdminCreateBrandRequest,
  AdminCreateCategoryRequest,
  CatalogReferenceImportEntity,
  CatalogReferenceImportResponse,
} from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import type { CatalogBrandWriteService } from "./catalog-brand-write.service.js";
import type { CatalogCategoryWriteService } from "./catalog-category-write.service.js";
import {
  type CatalogReferenceImportRepository,
  categoryKey,
  normalize,
} from "./catalog-reference-import.repository.js";
import {
  DEFAULT_REFERENCE_IMPORT_MAX_ROWS,
  parseReferenceImportCsv,
  type ReferenceImportFailure,
  type ReferenceImportRow,
} from "./catalog-reference-import-parser.js";
import { buildReferenceImportTemplate } from "./catalog-reference-import-template.js";

type Actor = { userId: string; userSlug: string };

export class CatalogReferenceImportService {
  constructor(
    private readonly repository: CatalogReferenceImportRepository,
    private readonly brandWriteService: Pick<
      CatalogBrandWriteService,
      "createBrand"
    >,
    private readonly categoryWriteService: Pick<
      CatalogCategoryWriteService,
      "createCategory"
    >,
    private readonly maxRows = DEFAULT_REFERENCE_IMPORT_MAX_ROWS,
  ) {}

  getTemplate(entity: CatalogReferenceImportEntity) {
    return buildReferenceImportTemplate(entity);
  }

  async importBrands(
    input: ImportInput,
  ): Promise<CatalogReferenceImportResponse> {
    const parsed = parseReferenceImportCsv(input.csv, "brand", this.maxRows);
    const existing = await this.repository.findExistingBrandNames(
      parsed.rows.map((row) => row.name),
    );
    return this.importRows({ ...input, entity: "brand", existing, parsed });
  }

  async importCategories(
    input: ImportInput,
  ): Promise<CatalogReferenceImportResponse> {
    const parsed = parseReferenceImportCsv(input.csv, "category", this.maxRows);
    const existing = await this.repository.findExistingCategoryKeys(
      parsed.rows.map((row) => ({
        name: row.name,
        parentCategorySlug: row.parentCategorySlug,
      })),
    );
    return this.importRows({ ...input, entity: "category", existing, parsed });
  }

  private async importRows(input: ImportRowsInput) {
    const failedRows = [...input.parsed.errors];
    const importedSlugs: string[] = [];

    for (const row of input.parsed.rows) {
      const key =
        input.entity === "brand"
          ? normalize(row.name)
          : categoryKey({
              name: row.name,
              parentCategorySlug: row.parentCategorySlug,
            });
      if (input.existing.has(key)) {
        failedRows.push(existingFailure(row));
        continue;
      }
      try {
        const created =
          input.entity === "brand"
            ? await this.brandWriteService.createBrand(
                input.actor,
                toBrandPayload(row),
                input.now,
              )
            : await this.categoryWriteService.createCategory(
                input.actor,
                toCategoryPayload(row),
                input.now,
              );
        importedSlugs.push(created.slug);
        input.existing.add(key);
      } catch (error) {
        failedRows.push(serviceFailure(row, error));
      }
    }

    return {
      entity: input.entity,
      failedRows,
      fileName: input.fileName,
      importedSlugs,
      processedAt: input.now.toISOString(),
      summary: {
        failedRows: failedRows.length,
        importedRows: importedSlugs.length,
        maxRows: this.maxRows,
        totalRows: input.parsed.totalRows,
        truncated: input.parsed.truncated,
      },
    };
  }
}

type ImportInput = {
  actor: Actor;
  csv: string;
  fileName: string;
  now: Date;
};

type ImportRowsInput = ImportInput & {
  entity: CatalogReferenceImportEntity;
  existing: Set<string>;
  parsed: ReturnType<typeof parseReferenceImportCsv>;
};

function toBrandPayload(row: ReferenceImportRow): AdminCreateBrandRequest {
  return {
    description: row.description,
    name: row.name,
    status: row.status,
    website: row.website,
  };
}

function toCategoryPayload(
  row: ReferenceImportRow,
): AdminCreateCategoryRequest {
  return {
    description: row.description,
    name: row.name,
    parentCategorySlug: row.parentCategorySlug,
    status: row.status,
  };
}

function existingFailure(row: ReferenceImportRow): ReferenceImportFailure {
  return rowFailure(row, "existing_name", "Name already exists.", "name");
}

function serviceFailure(
  row: ReferenceImportRow,
  error: unknown,
): ReferenceImportFailure {
  if (!isRowLevelAppError(error)) {
    throw error;
  }

  return rowFailure(row, "invalid_value", error.message);
}

function isRowLevelAppError(error: unknown): error is AppError {
  return (
    error instanceof AppError &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  );
}

function rowFailure(
  row: ReferenceImportRow,
  code: ReferenceImportFailure["errors"][number]["code"],
  message: string,
  field?: string,
): ReferenceImportFailure {
  return {
    errors: [
      { code, ...(field ? { field } : {}), message, rowNumber: row.rowNumber },
    ],
    originalRow: {
      description: row.description ?? "",
      name: row.name,
      parentCategorySlug: row.parentCategorySlug ?? "",
      status: row.status,
      website: row.website ?? "",
    },
    rowNumber: row.rowNumber,
  };
}
