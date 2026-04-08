import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countRecentFailures,
  getFailedAttemptOutcome,
  getRemainingLockoutSeconds,
  isLockoutActive,
} from "./lockout-policy.js";

describe("lockout policy", () => {
  it("counts only failures inside the rolling window", () => {
    const now = new Date("2026-04-08T12:00:00.000Z");
    const failures = [
      new Date("2026-04-08T11:58:00.000Z"),
      new Date("2026-04-08T11:50:00.000Z"),
      new Date("2026-04-08T11:40:00.000Z"),
    ];

    assert.equal(countRecentFailures(failures, now), 2);
  });

  it("locks the account when the threshold is reached", () => {
    const now = new Date("2026-04-08T12:00:00.000Z");
    const outcome = getFailedAttemptOutcome(4, now);

    assert.equal(outcome.nextFailureCount, 5);
    assert.ok(outcome.lockedUntil instanceof Date);
  });

  it("reports active lockout state and remaining seconds", () => {
    const now = new Date("2026-04-08T12:00:00.000Z");
    const lockedUntil = new Date("2026-04-08T12:10:00.000Z");

    assert.equal(isLockoutActive({ lockedUntil, now }), true);
    assert.equal(getRemainingLockoutSeconds({ lockedUntil, now }), 600);
  });
});
