import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSupplierQuery } from "./suppliers-page-client.support";

describe("suppliers page query", () => {
  it("builds a supplier-domain list query", () => {
    const query = createSupplierQuery({
      dir: "desc",
      page: 2,
      pageSize: 20,
      q: "acme",
      sort: "createdAt",
      status: "active",
    });

    assert.deepEqual(query, {
      dir: "desc",
      page: 2,
      pageSize: 20,
      q: "acme",
      sort: "createdAt",
      status: "active",
    });
  });
});
