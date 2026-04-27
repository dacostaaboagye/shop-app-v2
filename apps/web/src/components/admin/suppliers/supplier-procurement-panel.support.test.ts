import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendProcurementDraftLine,
  buildProcurementOrderPayload,
  removeProcurementDraftLine,
} from "./supplier-procurement-panel.support";

describe("supplier procurement panel support", () => {
  it("appends new draft lines and updates existing variants in place", () => {
    const firstPass = appendProcurementDraftLine([], {
      quantity: 4,
      unitCost: "10.00",
      variantSlug: "travel-pack-standard",
    });
    const secondPass = appendProcurementDraftLine(firstPass, {
      quantity: 6,
      unitCost: "11.50",
      variantSlug: "travel-pack-standard",
    });

    assert.equal(secondPass.length, 1);
    assert.equal(secondPass[0]?.quantity, 6);
    assert.equal(secondPass[0]?.unitCost, "11.50");
  });

  it("removes draft lines by variant slug", () => {
    const result = removeProcurementDraftLine(
      [
        { quantity: 4, unitCost: "10.00", variantSlug: "standard" },
        { quantity: 2, unitCost: "12.00", variantSlug: "large" },
      ],
      "standard",
    );

    assert.deepEqual(result, [
      { quantity: 2, unitCost: "12.00", variantSlug: "large" },
    ]);
  });

  it("builds the procurement create payload from queued lines", () => {
    const payload = buildProcurementOrderPayload({
      lines: [
        { quantity: 4, unitCost: "10.00", variantSlug: "standard" },
        { quantity: 2, unitCost: "", variantSlug: "large" },
      ],
      notes: " Restock high-demand items ",
    });

    assert.deepEqual(payload, {
      lines: [
        {
          requestedQuantity: 4,
          unitCost: "10.00",
          variantSlug: "standard",
        },
        {
          requestedQuantity: 2,
          unitCost: null,
          variantSlug: "large",
        },
      ],
      notes: "Restock high-demand items",
    });
  });
});
