import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { invoiceListQuerySchema } from "./sales.js";

describe("sales contracts", () => {
  it("accepts invoice document type filters", () => {
    const parsed = invoiceListQuerySchema.parse({
      documentType: "credit_note",
      locationId: "4181707d-c61e-4c22-995d-335295748060",
      page: "2",
    });

    assert.equal(parsed.documentType, "credit_note");
    assert.equal(parsed.page, 2);
  });

  it("defaults invoice document type to all", () => {
    const parsed = invoiceListQuerySchema.parse({
      locationId: "4181707d-c61e-4c22-995d-335295748060",
    });

    assert.equal(parsed.documentType, "all");
  });
});
