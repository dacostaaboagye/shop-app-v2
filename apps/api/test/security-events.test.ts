import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSecurityPasswordChangedEvent } from "../src/modules/auth/security-events.js";

describe("createSecurityPasswordChangedEvent", () => {
  it("targets the affected user directly", async () => {
    const event = createSecurityPasswordChangedEvent({
      userId: "11111111-1111-4111-8111-111111111111",
      userSlug: "ada-lovelace",
      occurredAt: new Date("2026-05-01T12:00:00.000Z"),
    });

    assert.equal(event.audience.length, 1);
    assert.deepEqual(event.audience[0], {
      kind: "user",
      userId: "11111111-1111-4111-8111-111111111111",
    });
    // Important: only the affected user is in the audience. We do NOT add
    // permission-scoped audiences here — that would surface the event in
    // the audit feed for admins, which is an audit-history concern handled
    // separately by access events. This event is the user-facing
    // breadcrumb only.
  });

  it("emits a stable type and a self-describing summary", () => {
    const event = createSecurityPasswordChangedEvent({
      userId: "u1",
      userSlug: "ada",
      occurredAt: new Date("2026-05-01T12:00:00.000Z"),
    });

    assert.equal(event.type, "account.password.changed");
    assert.equal(event.summary, "Your password was just changed.");
    assert.equal(event.resource.kind, "user_account");
    assert.equal(event.resource.reference, "ada");
  });

  it("populates actor and occurredAt as ISO strings", () => {
    const event = createSecurityPasswordChangedEvent({
      userId: "u1",
      userSlug: "ada",
      occurredAt: new Date("2026-05-01T12:00:00.000Z"),
    });

    assert.equal(event.actor.userSlug, "ada");
    assert.equal(event.occurredAt, "2026-05-01T12:00:00.000Z");
  });

  it("assigns a unique event id per call", () => {
    const a = createSecurityPasswordChangedEvent({
      userId: "u1",
      userSlug: "ada",
      occurredAt: new Date(),
    });
    const b = createSecurityPasswordChangedEvent({
      userId: "u1",
      userSlug: "ada",
      occurredAt: new Date(),
    });
    assert.notEqual(a.id, b.id);
  });
});
