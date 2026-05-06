import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resendWebhookRateLimit } from "../src/modules/messaging/email-webhook.routes.js";
import { createServer } from "../src/server/create-server.js";

describe("email webhook routes", () => {
  it("accepts a signed resend webhook event", async () => {
    const calls: unknown[] = [];
    const server = createServer({
      messagingWebhooks: {
        resendWebhookService: {
          async handleWebhook(input) {
            calls.push(input);
            return { duplicate: false, processed: true };
          },
        },
      },
    });

    const response = await server.inject({
      headers: {
        "content-type": "application/json",
        "svix-id": "evt_1",
        "svix-signature": "sig_1",
        "svix-timestamp": "1713880800",
      },
      method: "POST",
      payload: JSON.stringify({
        created_at: "2026-04-23T19:00:00.000Z",
        data: { email_id: "msg_123" },
        type: "email.delivered",
      }),
      url: "/api/messaging/webhooks/resend",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      duplicate: false,
      ok: true,
      processed: true,
    });
    assert.deepEqual(calls, [
      {
        headers: {
          id: "evt_1",
          signature: "sig_1",
          timestamp: "1713880800",
        },
        payload:
          '{"created_at":"2026-04-23T19:00:00.000Z","data":{"email_id":"msg_123"},"type":"email.delivered"}',
      },
    ]);
  });

  it("limits webhook bursts before invoking the webhook service", async () => {
    let webhookCalls = 0;
    const server = createServer({
      messagingWebhooks: {
        resendWebhookService: {
          async handleWebhook() {
            webhookCalls += 1;
            return { duplicate: false, processed: true };
          },
        },
      },
    });

    const responses = await Promise.all(
      Array.from({ length: resendWebhookRateLimit.max + 1 }, (_, index) =>
        server.inject({
          headers: {
            "content-type": "application/json",
            "svix-id": `evt_${index}`,
            "svix-signature": "sig_1",
            "svix-timestamp": "1713880800",
          },
          method: "POST",
          payload: JSON.stringify({
            created_at: "2026-04-23T19:00:00.000Z",
            data: { email_id: `msg_${index}` },
            type: "email.delivered",
          }),
          url: "/api/messaging/webhooks/resend",
        }),
      ),
    );

    const limitedResponse = responses.find(
      (response) => response.statusCode === 429,
    );
    assert.ok(limitedResponse);
    assert.equal(limitedResponse.statusCode, 429);
    assert.equal(limitedResponse.json().code, "rate_limited");
    assert.equal(webhookCalls, resendWebhookRateLimit.max);
  });

  it("declares a dedicated rate limit for resend webhooks", () => {
    assert.deepEqual(resendWebhookRateLimit, {
      groupId: "resend-webhook",
      max: 120,
      timeWindow: "1 minute",
    });
  });
});
