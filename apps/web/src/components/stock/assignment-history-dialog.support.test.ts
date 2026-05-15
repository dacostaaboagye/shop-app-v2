import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildManagerStockMovementHref,
  formatAssignmentHistoryEventLabel,
} from "./assignment-history-dialog.support";

describe("assignment history dialog support", () => {
  it("formats ownership event labels", () => {
    assert.equal(
      formatAssignmentHistoryEventLabel("handover_in"),
      "Handover received",
    );
    assert.equal(formatAssignmentHistoryEventLabel("reassigned"), "Reassigned");
  });

  it("builds manager stock movement deep links", () => {
    assert.equal(
      buildManagerStockMovementHref({
        locationSlug: "airport-store",
        sku: "OMAYA BLACK",
      }),
      "/manager/stock/movements?location=airport-store&sku=OMAYA+BLACK",
    );
  });
});
