import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getGtnDocumentHref } from "./gtn-document-actions.support";

describe("getGtnDocumentHref", () => {
  it("routes admin transfer GTNs to the admin document page", () => {
    assert.equal(
      getGtnDocumentHref({
        pathname: "/admin/transfers",
        reference: "GTN-2026/0001",
      }),
      "/admin/documents/gtns/GTN-2026%2F0001",
    );
  });

  it("routes manager and worker GTNs to their portal document pages", () => {
    assert.equal(
      getGtnDocumentHref({
        pathname: "/manager/stock/supply-requests",
        reference: "GTN-001",
      }),
      "/manager/documents/gtns/GTN-001",
    );
    assert.equal(
      getGtnDocumentHref({
        pathname: "/worker/stock/supply-requests",
        reference: "GTN-001",
      }),
      "/worker/documents/gtns/GTN-001",
    );
  });
});
