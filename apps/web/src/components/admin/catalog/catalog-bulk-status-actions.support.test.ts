import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getBulkStatusActionLabel,
  getBulkStatusActionRows,
  getBulkStatusResultMessage,
} from "./catalog-bulk-status-actions.support";

describe("getBulkStatusActionRows", () => {
  it("returns only rows that need the target status change", () => {
    assert.deepEqual(
      getBulkStatusActionRows(
        [{ status: "active" }, { status: "archived" }, { status: "active" }],
        "archived",
      ),
      [{ status: "active" }, { status: "active" }],
    );
  });
});

describe("getBulkStatusActionLabel", () => {
  it("returns the pending label for archive operations", () => {
    assert.equal(
      getBulkStatusActionLabel({
        actionableCount: 2,
        isPending: true,
        targetStatus: "archived",
      }),
      "Archiving...",
    );
  });
});

describe("getBulkStatusResultMessage", () => {
  it("returns a success message when all updates complete", () => {
    assert.deepEqual(
      getBulkStatusResultMessage({
        entityLabelPlural: "Products",
        failureCount: 0,
        successCount: 3,
        targetStatus: "active",
      }),
      {
        description: "Activated 3 products.",
        tone: "success",
      },
    );
  });

  it("returns an error summary when some updates fail", () => {
    assert.deepEqual(
      getBulkStatusResultMessage({
        entityLabelPlural: "Brands",
        failureCount: 1,
        successCount: 2,
        targetStatus: "archived",
      }),
      {
        description: "Archived 2 brands. 1 failed and may need manual review.",
        tone: "error",
      },
    );
  });
});
