import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DeliveryStatus } from "@shop/contracts";
import {
  canTransition,
  getAllowedNextStates,
  isTerminalStatus,
} from "../src/modules/deliveries/delivery-status-transition.policy.js";

describe("canTransition", () => {
  it("allows the four legal forward edges", () => {
    assert.deepEqual(canTransition("draft", "assigned"), { allowed: true });
    assert.deepEqual(canTransition("assigned", "in_transit"), {
      allowed: true,
    });
    assert.deepEqual(canTransition("in_transit", "completed"), {
      allowed: true,
    });
  });

  it("allows cancel from any non-terminal state", () => {
    for (const from of ["draft", "assigned", "in_transit"] as const) {
      assert.deepEqual(canTransition(from, "cancelled"), { allowed: true });
    }
  });

  it("rejects backward and skipping edges as illegal_transition", () => {
    const cases: [DeliveryStatus, DeliveryStatus][] = [
      ["assigned", "draft"],
      ["in_transit", "assigned"],
      ["draft", "in_transit"],
      ["draft", "completed"],
      ["assigned", "completed"],
    ];
    for (const [from, to] of cases) {
      assert.deepEqual(canTransition(from, to), {
        allowed: false,
        reason: "illegal_transition",
      });
    }
  });

  it("rejects any move out of terminal states as terminal_state", () => {
    const targets: DeliveryStatus[] = [
      "draft",
      "assigned",
      "in_transit",
      "completed",
      "cancelled",
    ];
    for (const to of targets) {
      assert.deepEqual(canTransition("completed", to), {
        allowed: false,
        reason: "terminal_state",
      });
      assert.deepEqual(canTransition("cancelled", to), {
        allowed: false,
        reason: "terminal_state",
      });
    }
  });
});

describe("getAllowedNextStates", () => {
  it("returns the adjacency list per state", () => {
    assert.deepEqual(
      [...getAllowedNextStates("draft")],
      ["assigned", "cancelled"],
    );
    assert.deepEqual(
      [...getAllowedNextStates("assigned")],
      ["in_transit", "cancelled"],
    );
    assert.deepEqual(
      [...getAllowedNextStates("in_transit")],
      ["completed", "cancelled"],
    );
    assert.deepEqual([...getAllowedNextStates("completed")], []);
    assert.deepEqual([...getAllowedNextStates("cancelled")], []);
  });
});

describe("isTerminalStatus", () => {
  it("identifies completed and cancelled as terminal", () => {
    assert.equal(isTerminalStatus("completed"), true);
    assert.equal(isTerminalStatus("cancelled"), true);
    assert.equal(isTerminalStatus("draft"), false);
    assert.equal(isTerminalStatus("assigned"), false);
    assert.equal(isTerminalStatus("in_transit"), false);
  });
});
