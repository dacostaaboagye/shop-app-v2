import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toSafeSourceReference } from "../src/modules/stock/postgres-stock-movement-query.repository.js";

describe("stock movement source references", () => {
  it("hides line identity from supplier receipt source keys", () => {
    assert.equal(
      toSafeSourceReference(
        "supplier_procurement_receipt",
        "SPR-2026-0004:line-17",
      ),
      "SPR-2026-0004",
    );
  });

  it("hides UUID source keys that are internal only", () => {
    assert.equal(
      toSafeSourceReference(
        "opening_stock",
        "11111111-1111-4111-8111-111111111111",
      ),
      null,
    );
    assert.equal(
      toSafeSourceReference(
        "supply_request",
        "22222222-2222-4222-8222-222222222222",
      ),
      null,
    );
  });

  it("exposes known public source references", () => {
    assert.equal(
      toSafeSourceReference("pos_sale", "INV-2026-0042:sku-1"),
      "INV-2026-0042",
    );
    assert.equal(
      toSafeSourceReference("stock_take", "STK-2026-0010:7"),
      "STK-2026-0010",
    );
  });
});
