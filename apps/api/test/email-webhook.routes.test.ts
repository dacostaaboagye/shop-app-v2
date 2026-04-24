import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
});
