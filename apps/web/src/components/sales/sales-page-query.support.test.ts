import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SALES_PAGE_SIZE_OPTIONS } from "./sales-page-query.support";

describe("sales page query support", () => {
  it("exposes the supported page sizes for sales history surfaces", () => {
    assert.deepEqual(SALES_PAGE_SIZE_OPTIONS, [10, 25, 50]);
  });
});
