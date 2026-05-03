import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOnlineOrderEligibleForDelivery,
  isPosSaleEligibleForDelivery,
  isTransferEligibleForDelivery,
} from "../src/modules/deliveries/delivery-source.policy.js";

describe("POS sale delivery eligibility", () => {
  it("accepts confirmed sales", () => {
    assert.deepEqual(isPosSaleEligibleForDelivery({ state: "confirmed" }), {
      eligible: true,
    });
  });

  it("rejects voided sales with state echoed back", () => {
    assert.deepEqual(isPosSaleEligibleForDelivery({ state: "voided" }), {
      eligible: false,
      state: "voided",
    });
  });

  it("rejects superseded sales", () => {
    assert.deepEqual(isPosSaleEligibleForDelivery({ state: "superseded" }), {
      eligible: false,
      state: "superseded",
    });
  });
});

describe("online order delivery eligibility", () => {
  it("accepts confirmed orders", () => {
    assert.deepEqual(isOnlineOrderEligibleForDelivery({ state: "confirmed" }), {
      eligible: true,
    });
  });

  it("rejects cancelled orders", () => {
    assert.deepEqual(isOnlineOrderEligibleForDelivery({ state: "cancelled" }), {
      eligible: false,
      state: "cancelled",
    });
  });

  it("rejects already-fulfilled orders so we don't re-create deliveries", () => {
    assert.deepEqual(isOnlineOrderEligibleForDelivery({ state: "fulfilled" }), {
      eligible: false,
      state: "fulfilled",
    });
  });
});

describe("transfer delivery eligibility", () => {
  it("accepts approved transfers", () => {
    assert.deepEqual(isTransferEligibleForDelivery({ state: "approved" }), {
      eligible: true,
    });
  });

  it("rejects draft transfers — only approved transfers move stock", () => {
    assert.deepEqual(isTransferEligibleForDelivery({ state: "draft" }), {
      eligible: false,
      state: "draft",
    });
  });

  it("rejects cancelled, dispatched, and received transfers", () => {
    for (const state of ["cancelled", "dispatched", "received"] as const) {
      assert.deepEqual(isTransferEligibleForDelivery({ state }), {
        eligible: false,
        state,
      });
    }
  });
});
