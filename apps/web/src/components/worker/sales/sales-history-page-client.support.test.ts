import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getWorkerSalesTableState,
  WORKER_SALES_DOCUMENT_TYPES,
} from "./sales-history-page-client.support";

describe("worker sales history page support", () => {
  it("exposes the supported worker document type filters", () => {
    assert.deepEqual(WORKER_SALES_DOCUMENT_TYPES, [
      "adjusted",
      "all",
      "credit_note",
      "invoice",
    ]);
  });

  it("returns a no-results state when filters are active", () => {
    const state = getWorkerSalesTableState(true);

    assert.equal(state.emptyTitle, "No sales match");
    assert.equal(
      state.emptyDescription,
      "Try broadening the current search or filters.",
    );
    assert.equal(state.emptyState.kind, "no-results");
  });

  it("returns a no-data state when there are no location sales yet", () => {
    const state = getWorkerSalesTableState(false);

    assert.equal(state.emptyTitle, "No sales recorded");
    assert.equal(
      state.emptyDescription,
      "No sales have been recorded at this location yet.",
    );
    assert.equal(state.emptyState.kind, "no-data");
  });
});
