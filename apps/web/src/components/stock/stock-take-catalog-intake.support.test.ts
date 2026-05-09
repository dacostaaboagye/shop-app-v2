import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StockTakeLine } from "@/lib/react-query/stock-takes";
import {
  buildCatalogFoundStockRequest,
  buildCatalogOpeningStockRequest,
  getCatalogIntakeDraftValidation,
  getCatalogStockIntakeDisabledReason,
  getCatalogStockIntakeSku,
  getDefaultCatalogIntakeDraft,
  getLineDisplayName,
  getManualStockTakeLines,
  toCatalogIntakeRequests,
} from "./stock-take-catalog-intake.support";

describe("stock take catalog intake helpers", () => {
  it("filters manual blank lines for catalog intake", () => {
    const lines = [
      buildLine({ lineNumber: 1, rowStatus: "catalog_sku" }),
      buildLine({ lineNumber: 2, rowStatus: "manual_blank" }),
      buildLine({ lineNumber: 3, rowStatus: "manual_blank" }),
    ];

    assert.deepEqual(
      getManualStockTakeLines(lines).map((line) => line.lineNumber),
      [2, 3],
    );
  });

  it("builds default draft values from counted manual rows", () => {
    const draft = getDefaultCatalogIntakeDraft(
      buildLine({
        countedQuantity: 7,
        note: "Found during warehouse count.",
        productName: "Rice",
        sku: "RICE-5KG",
        unitOfMeasure: "bag",
        variantName: "5kg",
      }),
    );

    assert.equal(draft.productName, "Rice");
    assert.equal(draft.variantName, "5kg");
    assert.equal(draft.sku, "RICE-5KG");
    assert.equal(draft.unitOfMeasure, "bag");
    assert.equal(draft.countedQuantity, 7);
    assert.equal(draft.description, "Found during warehouse count.");
  });

  it("creates archived product and variant requests", () => {
    const requests = toCatalogIntakeRequests({
      brandSlug: "none",
      categorySlug: "dry-goods",
      costPrice: "10.50",
      countedQuantity: 3,
      description: " Manual count intake ",
      isTaxable: false,
      lineNumber: 4,
      priceIncludesTax: true,
      productName: " Rice ",
      sellingPrice: "12.00",
      sku: " RICE-5KG ",
      unitOfMeasure: " bag ",
      variantName: " 5kg ",
    });

    assert.deepEqual(requests.product, {
      brandSlug: null,
      categorySlug: "dry-goods",
      description: "Manual count intake",
      isTaxable: false,
      name: "Rice",
      priceIncludesTax: true,
      status: "archived",
    });
    assert.deepEqual(requests.variant, {
      attributes: {},
      costPrice: "10.50",
      isDefault: true,
      name: "5kg",
      sellingPrice: "12.00",
      sku: "RICE-5KG",
      status: "archived",
      unitOfMeasure: "bag",
    });
  });

  it("validates required fields and money values", () => {
    const valid = getDefaultCatalogIntakeDraft(
      buildLine({
        productName: "Rice",
        sku: "RICE-5KG",
        unitOfMeasure: "bag",
        variantName: "5kg",
      }),
    );

    assert.equal(getCatalogIntakeDraftValidation(valid), null);
    assert.match(
      getCatalogIntakeDraftValidation({ ...valid, productName: "" }) ?? "",
      /product name/,
    );
    assert.match(
      getCatalogIntakeDraftValidation({ ...valid, costPrice: "10.999" }) ?? "",
      /cost price/,
    );
  });

  it("formats manual line labels without requiring catalog names", () => {
    assert.equal(
      getLineDisplayName(
        buildLine({ lineNumber: 9, productName: "", variantName: "" }),
      ),
      "Manual line 9",
    );
    assert.equal(
      getLineDisplayName(
        buildLine({ productName: "Rice", variantName: "5kg" }),
      ),
      "Rice - 5kg",
    );
  });

  it("uses the created draft SKU when the manual line had no SKU", () => {
    const line = buildLine({ lineNumber: 3, sku: "" });
    const createdDraft = {
      lineNumber: 3,
      productSlug: "rice",
      sku: "RICE-5KG",
      variantSlug: "rice-5kg",
    };

    assert.equal(getCatalogStockIntakeSku(line, createdDraft), "RICE-5KG");
    assert.equal(
      getCatalogStockIntakeDisabledReason({ createdDraft, line }),
      "Enter a counted quantity before recording stock.",
    );
  });

  it("builds opening stock requests from reviewed catalog intake rows", () => {
    const request = buildCatalogOpeningStockRequest({
      createdDraft: null,
      line: buildLine({
        countedQuantity: 7,
        lineNumber: 5,
        note: "Found during count.",
        sku: " RICE-5KG ",
      }),
      locationSlug: "main-store",
      reference: "ST-1001",
    });

    assert.deepEqual(request, {
      lines: [
        {
          note: "Stock-take ST-1001, line 5: Found during count.",
          onHandQuantity: 7,
          sku: "RICE-5KG",
        },
      ],
      locationSlug: "main-store",
      note: "Stock-take ST-1001, line 5: Found during count.",
      sourceReference: "ST-1001",
      sourceType: "physical_count",
    });
  });

  it("builds found-stock count requests from reviewed catalog intake rows", () => {
    const request = buildCatalogFoundStockRequest({
      createdDraft: {
        lineNumber: 6,
        productSlug: "rice",
        sku: "RICE-10KG",
        variantSlug: "rice-10kg",
      },
      line: buildLine({
        countedQuantity: 2,
        lineNumber: 6,
        sku: "",
      }),
      locationSlug: "warehouse",
      reference: "ST-1002",
    });

    assert.deepEqual(request, {
      locationSlug: "warehouse",
      note: "Stock-take ST-1002, line 6.",
      onHandQuantity: 2,
      reasonCode: "found_stock",
      sku: "RICE-10KG",
    });
  });
});

function buildLine(overrides: Partial<StockTakeLine>): StockTakeLine {
  return {
    appliedDelta: null,
    availableQuantity: null,
    countedQuantity: null,
    lineNumber: 1,
    note: null,
    productName: "",
    productSlug: null,
    reservedQuantity: null,
    rowStatus: "manual_blank",
    sku: "",
    systemOnHand: null,
    unitOfMeasure: "",
    variance: null,
    variantName: "",
    variantSlug: null,
    ...overrides,
  };
}
