import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { ResendEmailWebhookService } from "../src/modules/messaging/resend-email-webhook.service.js";

const NOW = new Date("2026-04-23T20:00:00.000Z");
const TIMESTAMP_IN_WINDOW = String(Math.floor(NOW.getTime() / 1000));

describe("ResendEmailWebhookService", () => {
  it("records a delivered lifecycle event against the provider message", async () => {
    const recorded: unknown[] = [];
    const published: unknown[] = [];
    const service = createService({
      async findAttemptByProviderMessageId(providerMessageId) {
        assert.equal(providerMessageId, "msg_123");
        return {
          id: "attempt_1",
          messageType: "email_verification",
          recipientEmail: "worker@example.com",
          subject: "Verify your email address",
        };
      },
      async recordStatusEvent(input) {
        recorded.push(input);
        return { inserted: true };
      },
      async publish(input) {
        published.push(input);
      },
    });

    const result = await service.handleWebhook({
      headers: {
        id: "evt_1",
        signature: "sig_1",
        timestamp: TIMESTAMP_IN_WINDOW,
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
    assert.equal(published.length, 0);
  });

  it("treats duplicate webhook deliveries as idempotent", async () => {
    const service = createService({
      async findAttemptByProviderMessageId() {
        return {
          id: "attempt_1",
          messageType: "email_verification",
          recipientEmail: "worker@example.com",
          subject: "Verify your email address",
        };
      },
      async recordStatusEvent() {
        return { inserted: false };
      },
    });

    const result = await service.handleWebhook({
      headers: {
        id: "evt_duplicate",
        signature: "sig_1",
        timestamp: TIMESTAMP_IN_WINDOW,
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

  it("throws 503 when webhookSecret is not configured", async () => {
    const service = new ResendEmailWebhookService({
      now: () => NOW,
      statusRepository: {
        async findAttemptByProviderMessageId() {
          return null;
        },
        async recordStatusEvent() {
          return { inserted: true };
        },
      },
      // webhookSecret intentionally omitted
    });

    await assert.rejects(
      () =>
        service.handleWebhook({
          headers: {
            id: "evt_1",
            signature: "sig_1",
            timestamp: TIMESTAMP_IN_WINDOW,
          },
          payload: JSON.stringify({
            created_at: "2026-04-23T19:00:00.000Z",
            data: { email_id: "msg_123" },
            type: "email.delivered",
          }),
        }),
      (error) =>
        error instanceof AppError &&
        error.statusCode === 503 &&
        error.title === "Webhook secret missing",
    );
  });

  it("extracts a statusReason for bounced events", async () => {
    const recorded: unknown[] = [];
    const published: unknown[] = [];
    const service = createService({
      async findAttemptByProviderMessageId() {
        return {
          id: "attempt_bounce",
          messageType: "supplier_invite",
          recipientEmail: "buyer@example.com",
          subject: "Supplier portal invitation",
        };
      },
      async recordStatusEvent(input) {
        recorded.push(input);
        return { inserted: true };
      },
      async publish(input) {
        published.push(input);
      },
    });

    await service.handleWebhook({
      headers: {
        id: "evt_bounce",
        signature: "sig_bounce",
        timestamp: TIMESTAMP_IN_WINDOW,
      },
      payload: JSON.stringify({
        created_at: "2026-04-23T19:00:00.000Z",
        data: {
          bounce: {
            message: "address does not exist",
            subType: "NoEmail",
            type: "Permanent",
          },
          email_id: "msg_bounce",
        },
        type: "email.bounced",
      }),
    });

    assert.equal((recorded[0] as { status: string }).status, "bounced");
    assert.equal(
      (recorded[0] as { statusReason: string }).statusReason,
      "Permanent - NoEmail - address does not exist",
    );
    assert.equal(
      (published[0] as { type: string }).type,
      "messaging.email.bounced",
    );
    assert.match(
      (published[0] as { summary: string }).summary,
      /buyer@example\.com/,
    );
  });

  it("returns processed:false for unrecognised event types without recording", async () => {
    const recorded: unknown[] = [];
    const service = createService({
      async findAttemptByProviderMessageId() {
        return null;
      },
      async recordStatusEvent(input) {
        recorded.push(input);
        return { inserted: true };
      },
    });

    const result = await service.handleWebhook({
      headers: {
        id: "evt_unknown",
        signature: "sig_1",
        timestamp: TIMESTAMP_IN_WINDOW,
      },
      payload: JSON.stringify({
        created_at: "2026-04-23T19:00:00.000Z",
        data: { email_id: "msg_123" },
        type: "email.unknown_future_event",
      }),
    });

    assert.deepEqual(result, { duplicate: false, processed: false });
    assert.equal(recorded.length, 0);
  });

  it("sets attemptId to null when no matching delivery attempt is found", async () => {
    const recorded: unknown[] = [];
    const service = createService({
      async findAttemptByProviderMessageId() {
        return null;
      },
      async recordStatusEvent(input) {
        recorded.push(input);
        return { inserted: true };
      },
    });

    await service.handleWebhook({
      headers: {
        id: "evt_orphan",
        signature: "sig_1",
        timestamp: TIMESTAMP_IN_WINDOW,
      },
      payload: JSON.stringify({
        created_at: "2026-04-23T19:00:00.000Z",
        data: { email_id: "msg_orphan" },
        type: "email.sent",
      }),
    });

    assert.equal((recorded[0] as { attemptId: string | null }).attemptId, null);
    assert.equal((recorded[0] as { status: string }).status, "sent");
  });

  it("rejects webhook events with a timestamp older than 5 minutes", async () => {
    const service = createService({});
    const sixMinutesAgo = String(Math.floor(NOW.getTime() / 1000) - 6 * 60);

    await assert.rejects(
      () =>
        service.handleWebhook({
          headers: {
            id: "evt_replay",
            signature: "sig_1",
            timestamp: sixMinutesAgo,
          },
          payload: JSON.stringify({
            created_at: "2026-04-23T19:54:00.000Z",
            data: { email_id: "msg_replay" },
            type: "email.bounced",
          }),
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 401);
        assert.match(error.message, /replay window/i);
        return true;
      },
    );
  });

  it("rejects webhook events with a timestamp more than 5 minutes in the future", async () => {
    const service = createService({});
    const sixMinutesFuture = String(Math.floor(NOW.getTime() / 1000) + 6 * 60);

    await assert.rejects(
      () =>
        service.handleWebhook({
          headers: {
            id: "evt_future",
            signature: "sig_1",
            timestamp: sixMinutesFuture,
          },
          payload: JSON.stringify({
            created_at: "2026-04-23T20:06:00.000Z",
            data: { email_id: "msg_future" },
            type: "email.bounced",
          }),
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 401);
        return true;
      },
    );
  });

  it("returns processed:false on malformed payload without throwing", async () => {
    const errorLogs: unknown[] = [];
    const service = createService({
      logger: {
        error(...args) {
          errorLogs.push(args);
        },
      },
    });

    const result = await service.handleWebhook({
      headers: {
        id: "evt_malformed",
        signature: "sig_1",
        timestamp: TIMESTAMP_IN_WINDOW,
      },
      // Schema requires data.email_id and type; both are missing.
      payload: JSON.stringify({ created_at: "2026-04-23T19:00:00.000Z" }),
    });

    assert.deepEqual(result, { duplicate: false, processed: false });
    assert.equal(errorLogs.length, 1);
  });
});

function createService(
  overrides: Partial<{
    findAttemptByProviderMessageId(providerMessageId: string): Promise<{
      id: string;
      messageType: string;
      recipientEmail: string;
      subject: string;
    } | null>;
    logger: {
      error(...args: unknown[]): void;
      warn?(...args: unknown[]): void;
    };
    publish(input: unknown): Promise<void>;
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
    ...(overrides.publish
      ? {
          eventPublisher: {
            publish: overrides.publish,
          },
        }
      : {}),
    ...(overrides.logger
      ? {
          logger: overrides.logger as Pick<Console, "error" | "warn">,
        }
      : {}),
    now: () => NOW,
    statusRepository: {
      async findAttemptByProviderMessageId(providerMessageId) {
        return overrides.findAttemptByProviderMessageId
          ? overrides.findAttemptByProviderMessageId(providerMessageId)
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
