import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { ResendEmailWebhookService } from "../src/modules/messaging/resend-email-webhook.service.js";

describe("ResendEmailWebhookService", () => {
  it("records a delivered lifecycle event against the provider message", async () => {
    const recorded: unknown[] = [];
    const service = createService({
      async findAttemptIdByProviderMessageId(providerMessageId) {
        assert.equal(providerMessageId, "msg_123");
        return "attempt_1";
      },
      async recordStatusEvent(input) {
        recorded.push(input);
        return { inserted: true };
      },
    });

    const result = await service.handleWebhook({
      headers: {
        id: "evt_1",
        signature: "sig_1",
        timestamp: "1713880800",
      },
      payload: JSON.stringify({
        created_at: "2026-04-23T19:00:00.000Z",
        data: { email_id: "msg_123" },
        type: "email.delivered",
      }),
    });

    assert.deepEqual(result, { duplicate: false, processed: true });
    assert.deepEqual(recorded, [
      {
        attemptId: "attempt_1",
        occurredAt: new Date("2026-04-23T19:00:00.000Z"),
        provider: "resend",
        providerEventId: "evt_1",
        providerEventType: "email.delivered",
        providerMessageId: "msg_123",
        receivedAt: new Date("2026-04-23T20:00:00.000Z"),
        status: "delivered",
      },
    ]);
  });

  it("treats duplicate webhook deliveries as idempotent", async () => {
    const service = createService({
      async findAttemptIdByProviderMessageId() {
        return "attempt_1";
      },
      async recordStatusEvent() {
        return { inserted: false };
      },
    });

    const result = await service.handleWebhook({
      headers: {
        id: "evt_duplicate",
        signature: "sig_1",
        timestamp: "1713880800",
      },
      payload: JSON.stringify({
        created_at: "2026-04-23T19:00:00.000Z",
        data: { email_id: "msg_123" },
        type: "email.delivered",
      }),
    });

    assert.deepEqual(result, { duplicate: true, processed: false });
  });

  it("rejects webhook calls with missing signature headers", async () => {
    const service = createService();

    await assert.rejects(
      () =>
        service.handleWebhook({
          headers: {
            id: undefined,
            signature: undefined,
            timestamp: undefined,
          },
          payload: JSON.stringify({
            created_at: "2026-04-23T19:00:00.000Z",
            data: { email_id: "msg_123" },
            type: "email.delivered",
          }),
        }),
      (error) =>
        error instanceof AppError &&
        error.statusCode === 401 &&
        error.title === "Invalid webhook signature",
    );
  });
});

function createService(
  overrides: Partial<{
    findAttemptIdByProviderMessageId(
      providerMessageId: string,
    ): Promise<string | null>;
    recordStatusEvent(input: {
      attemptId: string | null;
      occurredAt: Date;
      provider: "resend";
      providerEventId: string;
      providerEventType: string;
      providerMessageId: string;
      receivedAt: Date;
      status:
        | "bounced"
        | "complained"
        | "console_fallback"
        | "delayed"
        | "delivered"
        | "failed"
        | "sent"
        | "suppressed";
      statusReason?: string | null;
    }): Promise<{ inserted: boolean }>;
  }> = {},
) {
  return new ResendEmailWebhookService({
    now: () => new Date("2026-04-23T20:00:00.000Z"),
    statusRepository: {
      async findAttemptIdByProviderMessageId(providerMessageId) {
        return overrides.findAttemptIdByProviderMessageId
          ? overrides.findAttemptIdByProviderMessageId(providerMessageId)
          : null;
      },
      async recordStatusEvent(input) {
        return overrides.recordStatusEvent
          ? overrides.recordStatusEvent(input)
          : { inserted: true };
      },
    },
    verifier({ payload }) {
      return JSON.parse(payload);
    },
    webhookSecret: "whsec_test",
  });
}
