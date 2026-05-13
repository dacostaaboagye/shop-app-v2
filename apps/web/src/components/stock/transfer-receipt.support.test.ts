import assert from "node:assert/strict";
import test from "node:test";
import {
  buildConfirmReceiptPayload,
  getReceiptFormError,
  hasReceiptFormDiscrepancy,
  type TransferReceiptFormValues,
} from "./transfer-receipt.support";

const exactValues: TransferReceiptFormValues = {
  discrepancyNotes: "",
  discrepancyReason: "short_received",
  notes: "",
  receivedQuantity: "3",
};

test("receipt form accepts exact received quantity", () => {
  assert.equal(getReceiptFormError(exactValues, 3), null);
  assert.equal(hasReceiptFormDiscrepancy(exactValues, 3), false);
  assert.deepEqual(buildConfirmReceiptPayload(exactValues, 3), {
    receivedQuantity: 3,
  });
});

test("receipt form builds discrepancy evidence for lower quantities", () => {
  assert.deepEqual(
    buildConfirmReceiptPayload(
      {
        discrepancyNotes: " One unit damaged. ",
        discrepancyReason: "damaged_received",
        notes: "Accepted the rest.",
        receivedQuantity: "2",
      },
      3,
    ),
    {
      discrepancyNotes: "One unit damaged.",
      discrepancyReason: "damaged_received",
      notes: "Accepted the rest.",
      receivedQuantity: 2,
    },
  );
});

test("receipt form rejects over-receipt and invalid numbers", () => {
  assert.equal(
    getReceiptFormError({ ...exactValues, receivedQuantity: "4" }, 3),
    "Received quantity cannot be higher than dispatched quantity.",
  );
  assert.equal(
    getReceiptFormError({ ...exactValues, receivedQuantity: "two" }, 3),
    "Enter a whole received quantity.",
  );
});
