import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSummaryStats,
  getApplyDisabledReason,
  getDryRunReadinessMessage,
  getErrorAnchor,
  getImportFileSignature,
  getRowDisplayName,
  getRowTone,
  resolveImportContentType,
} from "./stock-take-import-review.support";

describe("stock take import review helpers", () => {
  it("defaults unknown browser file types to csv", () => {
    const file = new File(["sku,countedQuantity"], "count.csv", {
      lastModified: 0,
      type: "",
    });

    assert.equal(resolveImportContentType(file), "text/csv");
    assert.equal(getImportFileSignature(file), "count.csv:19:0:text/csv");
  });

  it("builds clear dry-run status copy", () => {
    assert.match(
      getDryRunReadinessMessage(buildDryRun({ canApply: true })),
      /passed validation/,
    );
    assert.match(
      getDryRunReadinessMessage(buildDryRun({ canApply: false })),
      /Resolve/,
    );
  });

  it("formats row and error display helpers", () => {
    assert.equal(
      getRowDisplayName({
        availableQuantity: 8,
        countedQuantity: 12,
        lineNumber: 1,
        note: null,
        productName: "Rice",
        reservedQuantity: 2,
        rowNumber: 2,
        sku: "RICE-5KG",
        status: "valid",
        systemOnHand: 10,
        variance: 2,
        variantName: "5kg",
      }),
      "Rice - 5kg",
    );
    assert.equal(
      getRowTone({
        availableQuantity: 8,
        countedQuantity: 12,
        lineNumber: 1,
        note: null,
        productName: "Rice",
        reservedQuantity: 2,
        rowNumber: 2,
        sku: "RICE-5KG",
        status: "valid",
        systemOnHand: 10,
        variance: 2,
        variantName: "5kg",
      }),
      "secondary",
    );
    assert.equal(
      getErrorAnchor({
        code: "missing_required",
        lineNumber: 4,
        message: "Counted quantity is required.",
        rowNumber: 3,
      }),
      "Row 3, line 4",
    );
  });

  it("keeps summary stat order stable", () => {
    const stats = buildSummaryStats(buildDryRun({ canApply: true }).summary);

    assert.deepEqual(
      stats.map((stat) => stat.label),
      [
        "Total rows",
        "Valid rows",
        "Invalid rows",
        "Duplicate rows",
        "Unknown SKU rows",
        "Variance rows",
      ],
    );
  });

  it("gates apply review by dry-run, file signature, session status, and pending state", () => {
    const dryRun = buildDryRun({ canApply: true });

    assert.equal(
      getApplyDisabledReason({
        currentFileSignature: "count.csv:1:1:text/csv",
        dryRun,
        isPending: false,
        sessionStatus: "generated",
        validatedFileSignature: "count.csv:1:1:text/csv",
      }),
      null,
    );
    assert.match(
      getApplyDisabledReason({
        currentFileSignature: null,
        dryRun: null,
        isPending: false,
        sessionStatus: "generated",
        validatedFileSignature: null,
      }) ?? "",
      /dry-run/,
    );
    assert.match(
      getApplyDisabledReason({
        currentFileSignature: "new.csv:1:1:text/csv",
        dryRun,
        isPending: false,
        sessionStatus: "generated",
        validatedFileSignature: "count.csv:1:1:text/csv",
      }) ?? "",
      /file changed/,
    );
    assert.match(
      getApplyDisabledReason({
        currentFileSignature: "count.csv:1:1:text/csv",
        dryRun,
        isPending: false,
        sessionStatus: "applied",
        validatedFileSignature: "count.csv:1:1:text/csv",
      }) ?? "",
      /already been applied/,
    );
    assert.match(
      getApplyDisabledReason({
        currentFileSignature: "count.csv:1:1:text/csv",
        dryRun,
        isPending: true,
        sessionStatus: "generated",
        validatedFileSignature: "count.csv:1:1:text/csv",
      }) ?? "",
      /in progress/,
    );
  });
});

function buildDryRun({ canApply }: { canApply: boolean }) {
  return {
    canApply,
    errors: [],
    locationName: "Central Shop",
    locationSlug: "central-shop",
    rows: [],
    status: "generated" as const,
    stockTakeReference: "STK-2026-0001",
    summary: {
      duplicateRows: 0,
      invalidRows: canApply ? 0 : 1,
      totalNegativeVariance: 0,
      totalPositiveVariance: 2,
      totalRows: 1,
      unknownRows: 0,
      validRows: canApply ? 1 : 0,
      varianceRows: 1,
    },
  };
}
