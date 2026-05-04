import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { StockTakeImportService } from "../src/modules/stock/stock-take-import.service.js";

const generatedSnapshot = {
  lines: [
    {
      availableQuantity: 8,
      expectedOnHand: 10,
      lineNumber: 1,
      mode: "assisted" as const,
      productName: "Rice",
      reservedQuantity: 2,
      rowStatus: "catalog_sku" as const,
      sku: "RICE-5KG",
      systemOnHand: 10,
      variantName: "5kg",
    },
    {
      availableQuantity: 3,
      expectedOnHand: 3,
      lineNumber: 2,
      mode: "assisted" as const,
      productName: "Oil",
      reservedQuantity: 0,
      rowStatus: "catalog_sku" as const,
      sku: "OIL-1L",
      systemOnHand: 3,
      variantName: "1L",
    },
  ],
  session: {
    generatedAt: new Date("2026-05-04T10:00:00.000Z"),
    locationId: "22222222-2222-4222-8222-222222222222",
    locationName: "Downtown Store",
    locationSlug: "downtown-store",
    mode: "assisted" as const,
    reference: "STKTAKE-2026-0001",
    status: "generated" as const,
  },
};

describe("StockTakeImportService", () => {
  it("returns a valid dry-run variance preview without persistence", async () => {
    const service = new StockTakeImportService({
      async getSnapshot() {
        return generatedSnapshot;
      },
    });

    const result = await service.dryRun({
      reference: "STKTAKE-2026-0001",
      request: request("lineNumber,sku,countedQuantity\n1,RICE-5KG,12"),
    });

    assert.equal(result.canApply, true);
    assert.equal(result.rows[0]?.variance, 2);
    assert.equal(result.summary.totalPositiveVariance, 2);
    assert.equal(result.errors.length, 0);
  });

  it("returns row errors for duplicates, unknown SKUs, and line mismatches", async () => {
    const service = new StockTakeImportService({
      async getSnapshot() {
        return generatedSnapshot;
      },
    });

    const result = await service.dryRun({
      reference: "STKTAKE-2026-0001",
      request: request(
        [
          "lineNumber,sku,countedQuantity",
          "1,RICE-5KG,12",
          "1,RICE-5KG,13",
          "2,UNKNOWN,1",
          "1,OIL-1L,2",
        ].join("\n"),
      ),
    });

    assert.equal(result.canApply, false);
    assert.match(
      result.errors.map((error) => error.code).join(","),
      /duplicate_sku/,
    );
    assert.match(
      result.errors.map((error) => error.code).join(","),
      /unknown_sku/,
    );
    assert.match(
      result.errors.map((error) => error.code).join(","),
      /line_sku_mismatch/,
    );
  });

  it("rejects applied sessions with conflict problem details", async () => {
    const service = new StockTakeImportService({
      async getSnapshot() {
        return {
          ...generatedSnapshot,
          session: { ...generatedSnapshot.session, status: "applied" as const },
        };
      },
    });

    await assert.rejects(
      () =>
        service.dryRun({
          reference: "STKTAKE-2026-0001",
          request: request("lineNumber,sku,countedQuantity\n1,RICE-5KG,12"),
        }),
      { statusCode: 409 },
    );
  });

  it("keeps blank generated sessions importable as a dry-run with row errors", async () => {
    const service = new StockTakeImportService({
      async getSnapshot() {
        return {
          ...generatedSnapshot,
          lines: [],
        };
      },
    });

    const result = await service.dryRun({
      reference: "STKTAKE-2026-0001",
      request: request("lineNumber,sku,countedQuantity\n1,NEW-SKU,5"),
    });

    assert.equal(result.canApply, false);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0]?.status, "invalid");
    assert.equal(result.errors[0]?.code, "unknown_sku");
  });

  it("masks system quantities and variance for blind dry-runs", async () => {
    const service = new StockTakeImportService({
      async getSnapshot() {
        return {
          ...generatedSnapshot,
          lines: generatedSnapshot.lines.map((line) => ({
            ...line,
            mode: "blind" as const,
          })),
          session: { ...generatedSnapshot.session, mode: "blind" as const },
        };
      },
    });

    const result = await service.dryRun({
      reference: "STKTAKE-2026-0001",
      request: request("lineNumber,sku,countedQuantity\n1,RICE-5KG,12"),
    });

    assert.equal(result.canApply, true);
    assert.equal(result.rows[0]?.systemOnHand, null);
    assert.equal(result.rows[0]?.reservedQuantity, null);
    assert.equal(result.rows[0]?.availableQuantity, null);
    assert.equal(result.rows[0]?.variance, null);
    assert.equal(result.summary.varianceRows, 0);
  });

  it("rejects valid SKUs with line numbers outside the generated sheet", async () => {
    const service = new StockTakeImportService({
      async getSnapshot() {
        return generatedSnapshot;
      },
    });

    const result = await service.dryRun({
      reference: "STKTAKE-2026-0001",
      request: request("lineNumber,sku,countedQuantity\n999,RICE-5KG,12"),
    });

    assert.equal(result.canApply, false);
    assert.equal(result.errors[0]?.code, "line_sku_mismatch");
    assert.equal(result.rows[0]?.status, "invalid");
  });
});

function request(csv: string) {
  return {
    contentType: "text/csv" as const,
    csv,
    fileName: "stock-take.csv",
  };
}
