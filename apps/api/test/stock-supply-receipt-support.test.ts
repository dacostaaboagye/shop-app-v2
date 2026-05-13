import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { normalizeReceiptInput } from "../src/modules/stock/stock-supply-receipt-support.js";

describe("stock supply receipt support", () => {
  it("defaults an exact receipt to the approved quantity", () => {
    const receipt = normalizeReceiptInput({
      approvedQuantity: 12,
      discrepancyNotes: undefined,
      discrepancyReason: undefined,
      receivedQuantity: undefined,
    });

    assert.deepEqual(receipt, {
      discrepancyNotes: null,
      discrepancyReason: null,
      expectedQuantity: 12,
      missingQuantity: 0,
      receivedQuantity: 12,
    });
  });

  it("requires a discrepancy reason when fewer units are received", () => {
    assert.throws(
      () =>
        normalizeReceiptInput({
          approvedQuantity: 12,
          discrepancyNotes: undefined,
          discrepancyReason: undefined,
          receivedQuantity: 9,
        }),
      (error) =>
        error instanceof AppError &&
        error.statusCode === 400 &&
        error.title === "Discrepancy reason required",
    );
  });

  it("records a lower accepted quantity with trimmed discrepancy evidence", () => {
    const receipt = normalizeReceiptInput({
      approvedQuantity: 12,
      discrepancyNotes: "  Three cases damaged in transit.  ",
      discrepancyReason: "damaged_received",
      receivedQuantity: 9,
    });

    assert.deepEqual(receipt, {
      discrepancyNotes: "Three cases damaged in transit.",
      discrepancyReason: "damaged_received",
      expectedQuantity: 12,
      missingQuantity: 3,
      receivedQuantity: 9,
    });
  });

  it("rejects a received quantity above the dispatched quantity", () => {
    assert.throws(
      () =>
        normalizeReceiptInput({
          approvedQuantity: 12,
          discrepancyNotes: undefined,
          discrepancyReason: undefined,
          receivedQuantity: 13,
        }),
      (error) =>
        error instanceof AppError &&
        error.statusCode === 400 &&
        error.title === "Invalid received quantity",
    );
  });
});
