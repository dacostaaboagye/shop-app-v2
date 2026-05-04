import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StockTakeApplyReviewCard } from "./stock-take-apply-review-card";

Object.assign(globalThis, { React });

describe("StockTakeApplyReviewCard", () => {
  it("renders the guarded apply action for a clean reviewed dry-run", () => {
    const markup = renderToStaticMarkup(
      <StockTakeApplyReviewCard
        applyError={null}
        applyResult={null}
        currentFileSignature="count.csv:1:1:text/csv"
        dryRun={buildDryRun({ canApply: true })}
        importFileName="count.csv"
        isApplyPending={false}
        onApply={() => undefined}
        sessionStatus="generated"
        validatedFileSignature="count.csv:1:1:text/csv"
      />,
    );

    assert.match(markup, /Apply reviewed stock-take/);
    assert.match(markup, /Requires confirmation/);
    assert.match(markup, /Apply reviewed import/);
  });

  it("does not render until a dry-run can apply", () => {
    const markup = renderToStaticMarkup(
      <StockTakeApplyReviewCard
        applyError={null}
        applyResult={null}
        currentFileSignature="count.csv:1:1:text/csv"
        dryRun={buildDryRun({ canApply: false })}
        importFileName="count.csv"
        isApplyPending={false}
        onApply={() => undefined}
        sessionStatus="generated"
        validatedFileSignature="count.csv:1:1:text/csv"
      />,
    );

    assert.equal(markup, "");
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
