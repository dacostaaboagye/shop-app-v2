import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import {
  assertUniqueReceiptVariants,
  calculateReceiptDelta,
  missingReceiptDestination,
  receiptMovementSourceKey,
} from "../src/modules/admin/supplier-procurement-receipt-rules.js";

describe("supplier procurement receipt rules", () => {
  it("calculates stock deltas from the previous received total", () => {
    assert.equal(
      calculateReceiptDelta({
        expectedQuantity: 10,
        previousReceivedQuantity: 4,
        receivedQuantity: 7,
        variantSlug: "soap-fresh",
      }),
      3,
    );
  });

  it("returns zero for an identical retry", () => {
    assert.equal(
      calculateReceiptDelta({
        expectedQuantity: 10,
        previousReceivedQuantity: 7,
        receivedQuantity: 7,
        variantSlug: "soap-fresh",
      }),
      0,
    );
  });

  it("rejects reducing previously received quantities", () => {
    assert.throws(
      () =>
        calculateReceiptDelta({
          expectedQuantity: 10,
          previousReceivedQuantity: 7,
          receivedQuantity: 6,
          variantSlug: "soap-fresh",
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 400 &&
        error.title === "Invalid receipt quantity",
    );
  });

  it("rejects over-receipt beyond the expected quantity", () => {
    assert.throws(
      () =>
        calculateReceiptDelta({
          expectedQuantity: 10,
          previousReceivedQuantity: 7,
          receivedQuantity: 11,
          variantSlug: "soap-fresh",
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 400 &&
        error.title === "Invalid receipt quantity",
    );
  });

  it("rejects duplicate receipt variants in one payload", () => {
    assert.throws(
      () =>
        assertUniqueReceiptVariants([
          { receivedQuantity: 2, variantSlug: "soap-fresh" },
          { receivedQuantity: 3, variantSlug: "soap-fresh" },
        ]),
      (error: unknown) =>
        error instanceof AppError &&
        error.message.includes("duplicate variant"),
    );
  });

  it("builds stable source keys per line and received total", () => {
    assert.equal(
      receiptMovementSourceKey({
        lineId: "11111111-1111-4111-8111-111111111111",
        receivedQuantity: 7,
        reference: "PO-2026-0001",
      }),
      "PO-2026-0001:11111111-1111-4111-8111-111111111111:7",
    );
  });

  it("returns an actionable destination error", () => {
    const error = missingReceiptDestination("PO-2026-0001");

    assert.equal(error.statusCode, 400);
    assert.equal(error.title, "Receipt destination required");
    assert.match(error.message, /no destination location/);
  });
});
