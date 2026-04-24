import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { InvoiceLineItemResponse } from "@shop/contracts";
import {
  buildReturnRequestDraft,
  getInitialReturnQuantities,
} from "./pos-sale-return-dialog.support";

const line: InvoiceLineItemResponse = {
  lineTotal: "20.00",
  quantity: 2,
  skuId: "00000000-0000-4000-8000-000000000001",
  skuSnapshot: {
    productName: "Test shirt",
    sku: "TS-001",
    variantName: "Medium",
  },
  stockMovementId: null,
  taxAmount: "0.00",
  taxCategory: null,
  taxRate: null,
  unitPrice: "10.00",
};

describe("pos sale return dialog support", () => {
  it("builds a return request from selected line quantities", () => {
    const draft = buildReturnRequestDraft({
      lines: [line],
      quantities: { [line.skuId]: "1" },
      reason: "Customer changed size",
    });

    assert.equal(draft.ok, true);
    if (draft.ok) {
      assert.deepEqual(draft.request, {
        lines: [{ quantity: 1, skuId: line.skuId }],
        reason: "Customer changed size",
      });
    }
  });

  it("rejects quantities above the original sale quantity", () => {
    const draft = buildReturnRequestDraft({
      lines: [line],
      quantities: { [line.skuId]: "3" },
      reason: "Customer changed size",
    });

    assert.equal(draft.ok, false);
    if (!draft.ok) {
      assert.equal(draft.fieldErrors[line.skuId], "Cannot return more than 2.");
    }
  });

  it("requires a reason and at least one selected quantity", () => {
    const draft = buildReturnRequestDraft({
      lines: [line],
      quantities: { [line.skuId]: "0" },
      reason: " ",
    });

    assert.equal(draft.ok, false);
    if (!draft.ok) {
      assert.equal(draft.fieldErrors.reason, "Enter the return reason.");
      assert.equal(
        draft.formError,
        "Select at least one item quantity to return.",
      );
    }
  });

  it("initializes all line quantities to zero", () => {
    assert.deepEqual(getInitialReturnQuantities([line]), {
      [line.skuId]: "0",
    });
  });
});
