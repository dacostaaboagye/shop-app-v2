import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  StockTakeApplyResponse,
  StockTakeDryRunErrorCode,
  StockTakeDryRunRowError,
} from "@shop/contracts";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { StockTakeApplyService } from "../src/modules/stock/stock-take-apply.service.js";

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

describe("StockTakeApplyService", () => {
  it("revalidates a reviewed CSV and delegates parsed rows to the repository", async () => {
    const state = { rowCount: 0, reference: "" };
    const service = new StockTakeApplyService(
      {
        async apply(input) {
          state.rowCount = input.rows.length;
          state.reference = input.reference;
          return applyResponse();
        },
      },
      {
        async getSnapshot() {
          return generatedSnapshot;
        },
      },
    );

    const result = await service.apply({
      appliedBy: "11111111-1111-4111-8111-111111111111",
      appliedBySlug: "manager",
      reference: "STKTAKE-2026-0001",
      request: request(
        ["lineNumber,sku,countedQuantity", "1,RICE-5KG,12", "2,OIL-1L,3"].join(
          "\n",
        ),
      ),
    });

    assert.equal(result.status, "applied");
    assert.equal(state.reference, "STKTAKE-2026-0001");
    assert.equal(state.rowCount, 2);
  });

  it("rejects apply when any generated catalog line is missing", async () => {
    const service = new StockTakeApplyService(noopApplyRepository(), {
      async getSnapshot() {
        return generatedSnapshot;
      },
    });

    await assertRejectsWithCodes(
      () =>
        service.apply({
          reference: "STKTAKE-2026-0001",
          request: request("lineNumber,sku,countedQuantity\n1,RICE-5KG,12"),
        }),
      ["missing_line"],
    );
  });

  it("rejects apply when the session has no generated catalog SKU lines", async () => {
    const service = new StockTakeApplyService(noopApplyRepository(), {
      async getSnapshot() {
        return {
          ...generatedSnapshot,
          lines: [],
        };
      },
    });

    await assertRejectsWithCodes(
      () =>
        service.apply({
          reference: "STKTAKE-2026-0001",
          request: request("lineNumber,sku,countedQuantity\n1,NEW-SKU,4"),
        }),
      ["missing_line", "unknown_sku"],
    );
  });

  it("rejects duplicate and unknown rows before persistence", async () => {
    const service = new StockTakeApplyService(noopApplyRepository(), {
      async getSnapshot() {
        return generatedSnapshot;
      },
    });

    await assertRejectsWithCodes(
      () =>
        service.apply({
          reference: "STKTAKE-2026-0001",
          request: request(
            [
              "lineNumber,sku,countedQuantity",
              "1,RICE-5KG,12",
              "1,RICE-5KG,13",
              "2,UNKNOWN,1",
            ].join("\n"),
          ),
        }),
      ["duplicate_sku", "unknown_sku"],
    );
  });

  it("returns not found before parsing when the stock-take reference is missing", async () => {
    const service = new StockTakeApplyService(noopApplyRepository(), {
      async getSnapshot() {
        return null;
      },
    });

    await assert.rejects(
      () =>
        service.apply({
          reference: "STKTAKE-2026-9999",
          request: request("not,a,stock,take,csv"),
        }),
      { statusCode: 404 },
    );
  });
});

function noopApplyRepository() {
  return {
    async apply(): Promise<StockTakeApplyResponse> {
      throw new Error("Apply repository should not be called.");
    },
  };
}

async function assertRejectsWithCodes(
  fn: () => Promise<unknown>,
  expectedCodes: StockTakeDryRunErrorCode[],
) {
  try {
    await fn();
    assert.fail("Expected apply validation to reject.");
  } catch (error) {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 400);
    const errors = error.details?.errors as StockTakeDryRunRowError[];
    const actualCodes = errors.map((rowError) => rowError.code);
    for (const expectedCode of expectedCodes) {
      assert.ok(actualCodes.includes(expectedCode), expectedCode);
    }
  }
}

function request(csv: string) {
  return {
    contentType: "text/csv" as const,
    csv,
    fileName: "stock-take.csv",
    reviewed: true as const,
  };
}

function applyResponse(): StockTakeApplyResponse {
  return {
    appliedAt: "2026-05-04T10:10:00.000Z",
    appliedByUserSlug: "manager",
    lines: [],
    locationName: "Downtown Store",
    locationSlug: "downtown-store",
    status: "applied",
    stockTakeReference: "STKTAKE-2026-0001",
    summary: {
      appliedRows: 0,
      changedRows: 0,
      noChangeRows: 0,
      totalNegativeDelta: 0,
      totalPositiveDelta: 0,
    },
  };
}
