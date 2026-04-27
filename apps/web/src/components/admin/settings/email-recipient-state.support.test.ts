import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canSendToRecipient,
  formatBlockedRecipientStatus,
} from "./email-recipient-state.support";

describe("email recipient state support", () => {
  it("treats missing recipient state as clear to send", () => {
    assert.equal(canSendToRecipient(undefined), true);
    assert.equal(canSendToRecipient(null), true);
  });

  it("blocks sends only when the recipient state explicitly says canSend=false", () => {
    assert.equal(canSendToRecipient({ canSend: true }), true);
    assert.equal(canSendToRecipient({ canSend: false }), false);
  });

  it("formats provider lifecycle states into operator-readable labels", () => {
    assert.equal(formatBlockedRecipientStatus("bounced"), "Bounced");
    assert.equal(formatBlockedRecipientStatus("complained"), "Complained");
    assert.equal(formatBlockedRecipientStatus("suppressed"), "Suppressed");
    assert.equal(formatBlockedRecipientStatus("failed"), "Blocked");
    assert.equal(formatBlockedRecipientStatus(null), "Blocked");
  });
});
