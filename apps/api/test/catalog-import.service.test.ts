import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  AdminCreateProductRequest,
  AdminCreateVariantRequest,
} from "@shop/contracts";
import type {
  CatalogImportJobRecord,
  CatalogImportRepository,
} from "../src/modules/catalog/catalog-import.repository.js";
import { CatalogImportService } from "../src/modules/catalog/catalog-import.service.js";
import type { CatalogProductWriteService } from "../src/modules/catalog/catalog-product-write.service.js";

const now = new Date("2026-05-03T12:00:00.000Z");
const actor = { userId: "usr_123", userSlug: "admin-user" };

describe("CatalogImportService", () => {
  it("imports valid rows and reports existing SKU conflicts", async () => {
    const repo = createRepo({ existingSkus: new Set(["SKU-EXISTS"]) });
    const calls: string[] = [];
    const scheduled = createScheduler();
    const service = new CatalogImportService(
      repo,
      {
        async createProduct(
          _actor: typeof actor,
          payload: AdminCreateProductRequest,
        ) {
          calls.push(`product:${payload.name}`);
          return product(payload.name);
        },
        async createVariant(
          _actor: typeof actor,
          productSlug: string,
          payload: AdminCreateVariantRequest,
        ) {
          calls.push(`variant:${productSlug}:${payload.sku}`);
          return {} as Awaited<
            ReturnType<CatalogProductWriteService["createVariant"]>
          >;
        },
      } as unknown as CatalogProductWriteService,
      100,
      scheduled.schedule,
    );

    const result = await service.startImport({
      actor,
      contentType: "text/csv",
      csv: [
        "productName,variantName,sku,unitOfMeasure,costPrice,sellingPrice",
        "Training Shoe,Black,SKU-1,each,10.00,15.00",
        "Training Shoe,White,SKU-EXISTS,each,10.00,15.00",
      ].join("\n"),
      fileName: "catalog.csv",
      now,
    });
    assert.equal(result.status, "queued");
    await scheduled.runAll();
    const job = await service.getJob(result.jobReference);
    const report = await service.getReport(result.jobReference);

    assert.equal(job?.status, "completed_with_errors");
    assert.deepEqual(calls, [
      "product:Training Shoe",
      "variant:training-shoe:SKU-1",
    ]);
    assert.equal(job?.summary.validRows, 1);
    assert.equal(report?.failedRows[0]?.errors[0]?.code, "duplicate_sku");
  });

  it("uses parsed original CSV rows for service-layer failures", async () => {
    const repo = createRepo({ existingSkus: new Set() });
    const scheduled = createScheduler();
    const service = new CatalogImportService(
      repo,
      {
        async createProduct(
          _actor: typeof actor,
          payload: AdminCreateProductRequest,
        ) {
          return product(payload.name);
        },
        async createVariant() {
          throw new Error("variant rejected");
        },
        async deleteProductWithActor() {},
      } as unknown as CatalogProductWriteService,
      100,
      scheduled.schedule,
    );

    const result = await service.startImport({
      actor,
      contentType: "text/csv",
      csv: [
        "productName,variantName,sku,unitOfMeasure,costPrice,sellingPrice,description",
        'Training Shoe,Black,SKU-1,each,10.00,15.00,"Road, trail"',
      ].join("\n"),
      fileName: "catalog.csv",
      now,
    });
    assert.equal(result.status, "queued");
    await scheduled.runAll();
    const report = await service.getReport(result.jobReference);

    const job = await service.getJob(result.jobReference);
    assert.equal(job?.status, "completed_with_errors");
    assert.equal(report?.failedRows[0]?.originalRow.description, "Road, trail");
    assert.equal(
      "attributes" in (report?.failedRows[0]?.originalRow ?? {}),
      false,
    );
  });

  it("compensates a product created by a row when its variant fails", async () => {
    const repo = createRepo({ existingSkus: new Set() });
    const calls: string[] = [];
    const productStore = new Set<string>();
    const scheduled = createScheduler();
    const service = new CatalogImportService(
      repo,
      {
        async createProduct(
          _actor: typeof actor,
          payload: AdminCreateProductRequest,
        ) {
          calls.push(`product:${payload.name}`);
          const created = product(payload.name);
          productStore.add(created.slug);
          return created;
        },
        async createVariant() {
          calls.push("variant:failed");
          throw new Error("variant rejected");
        },
        async deleteProductWithActor(_actor: typeof actor, slug: string) {
          calls.push(`delete:${slug}`);
          productStore.delete(slug);
        },
      } as unknown as CatalogProductWriteService,
      100,
      scheduled.schedule,
    );

    const result = await service.startImport({
      actor,
      contentType: "text/csv",
      csv: [
        "productName,variantName,sku,unitOfMeasure,costPrice,sellingPrice",
        "Training Shoe,Black,SKU-1,each,10.00,15.00",
      ].join("\n"),
      fileName: "catalog.csv",
      now,
    });
    await scheduled.runAll();
    const job = await service.getJob(result.jobReference);

    assert.equal(job?.status, "completed_with_errors");
    assert.equal(productStore.size, 0);
    assert.deepEqual(calls, [
      "product:Training Shoe",
      "variant:failed",
      "delete:training-shoe",
    ]);
  });

  it("marks processing and then failed when a top-level failure aborts the job", async () => {
    const repo = createRepo({
      existingSkus: new Set(),
      failFindExistingSkus: true,
    });
    const scheduled = createScheduler();
    const service = new CatalogImportService(
      repo,
      {
        async createProduct() {
          throw new Error("should not import rows");
        },
      } as unknown as CatalogProductWriteService,
      100,
      scheduled.schedule,
    );

    const result = await service.startImport({
      actor,
      contentType: "text/csv",
      csv: [
        "productName,variantName,sku,unitOfMeasure,costPrice,sellingPrice",
        "Training Shoe,Black,SKU-1,each,10.00,15.00",
      ].join("\n"),
      fileName: "catalog.csv",
      now,
    });
    assert.equal(result.status, "queued");
    await assert.rejects(() => scheduled.runAll());

    const stored = repo.getStored();
    assert.equal(stored.status, "failed");
    assert.equal(stored.completedAt?.toISOString(), now.toISOString());
    assert.equal(stored.failureReason, "lookup failed");
    assert.deepEqual(repo.transitions, ["processing", "failed"]);
  });
});

function createRepo(input: {
  existingSkus: Set<string>;
  failFindExistingSkus?: boolean;
}): CatalogImportRepository & {
  getStored(): CatalogImportJobRecord;
  transitions: string[];
} {
  const transitions: string[] = [];
  let stored: CatalogImportJobRecord = {
    completedAt: null,
    createdAt: now,
    failedRows: [],
    failureReason: null,
    fileName: "catalog.csv",
    jobReference: "CIMP-TEST1",
    maxRows: 100,
    rawCsv: "",
    status: "queued" as const,
    summary: {
      invalidRows: 0,
      maxRows: 100,
      totalRows: 0,
      truncated: false,
      validRows: 0,
    },
  };

  return {
    transitions,
    async createQueued(args) {
      stored = {
        ...stored,
        createdAt: args.now,
        fileName: args.fileName,
        jobReference: args.jobReference,
        maxRows: args.maxRows,
        rawCsv: args.csv,
      };
      return stored;
    },
    async findByReference() {
      return stored;
    },
    async findExistingBarcodes() {
      return new Set();
    },
    async findExistingSkus() {
      if (input.failFindExistingSkus) throw new Error("lookup failed");
      return input.existingSkus;
    },
    getStored() {
      return stored;
    },
    async markFailed(args) {
      transitions.push("failed");
      stored = {
        ...stored,
        completedAt: args.completedAt,
        failureReason: args.failureReason,
        status: "failed",
      };
      return stored;
    },
    async markProcessing() {
      transitions.push("processing");
      stored = { ...stored, status: "processing" };
      return stored;
    },
    async updateResult(args) {
      stored = {
        ...stored,
        completedAt: args.completedAt,
        failedRows: args.failedRows,
        status: args.status,
        summary: {
          invalidRows: args.failedRows.length,
          maxRows: args.maxRows,
          totalRows: args.totalRows,
          truncated: false,
          validRows: args.importedRows,
        },
      };
      return stored;
    },
  };
}

function createScheduler() {
  const tasks: Array<() => Promise<void>> = [];
  return {
    schedule(task: () => Promise<void>) {
      tasks.push(task);
    },
    async runAll() {
      for (const task of tasks.splice(0)) await task();
    },
  };
}

function product(name: string) {
  return {
    archivedAt: null,
    brandSlug: null,
    categorySlug: null,
    countryOfOrigin: null,
    createdAt: now.toISOString(),
    description: null,
    features: [],
    isTaxable: true,
    name,
    options: [],
    priceIncludesTax: false,
    slug: name.toLowerCase().replaceAll(" ", "-"),
    status: "active" as const,
    taxCategory: null,
    variantCount: 0,
    variants: [],
  };
}
