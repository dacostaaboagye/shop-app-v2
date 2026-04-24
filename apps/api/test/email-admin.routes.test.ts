import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  EmailOperationsResponse,
  EmailRecipientStateResponse,
} from "@shop/contracts";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-04-23T18:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("email admin routes", () => {
  it("returns messaging operations overview", async () => {
    const server = createMessagingServer();

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: "/api/admin/settings/email/operations",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().mode, "live_send");
    assert.equal(response.json().fromAddress, "noreply@example.com");
    assert.equal(response.json().recentAttempts.length, 1);
  });

  it("sends a test email through the operations service", async () => {
    const calls: string[] = [];
    const server = createMessagingServer({
      async sendTestEmail(input) {
        calls.push(input.targetEmail);
      },
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "POST",
      payload: { targetEmail: "ops@example.com" },
      url: "/api/admin/settings/email/test-send",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
    assert.deepEqual(calls, ["ops@example.com"]);
  });

  it("returns a structured conflict when test send is blocked", async () => {
    const server = createMessagingServer({
      async sendTestEmail() {
        throw new AppError({
          code: "conflict",
          detail:
            "ops@example.com cannot receive email right now because the provider has suppressed the address.",
          details: {
            occurredAt: "2026-04-24T00:00:00.000Z",
            recipientEmail: "ops@example.com",
            status: "suppressed",
          },
          statusCode: 409,
          title: "Email delivery blocked",
        });
      },
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "POST",
      payload: { targetEmail: "ops@example.com" },
      url: "/api/admin/settings/email/test-send",
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().title, "Email delivery blocked");
    assert.equal(response.json().code, "conflict");
  });

  it("returns recipient delivery state for operators", async () => {
    const server = createMessagingServer({
      async getRecipientState(input) {
        assert.equal(input.recipientEmail, "ops@example.com");
        return {
          canSend: false,
          occurredAt: "2026-04-24T00:00:00.000Z",
          recipientEmail: input.recipientEmail,
          status: "suppressed",
          statusReason: "Provider suppression list",
          summary:
            "This address is currently suppressed by the provider. Resolve the suppression before retrying.",
        };
      },
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: "/api/admin/settings/email/recipient-state?email=ops%40example.com",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().status, "suppressed");
    assert.equal(response.json().canSend, false);
  });
});

function createMessagingServer(
  input: {
    getOperationsOverview?: (input: {
      now: Date;
    }) => Promise<EmailOperationsResponse>;
    getRecipientState?: (input: {
      recipientEmail: string;
    }) => Promise<EmailRecipientStateResponse>;
    sendTestEmail?: (input: { targetEmail: string }) => Promise<void>;
  } = {},
) {
  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate(token) {
          const { AccessTokenAuthenticationService } = await import(
            "../src/modules/auth/access-token-authentication.service.js"
          );
          return new AccessTokenAuthenticationService(
            {
              async findUserById() {
                return {
                  id: USER_ID,
                  slug: "admin-user",
                  status: "active" as const,
                };
              },
            },
            "development-access-secret",
            () => NOW,
          ).authenticate(token);
        },
      },
      permissionService: {
        async assertHasPermission() {
          return;
        },
      },
    },
    messagingAdmin: {
      operationsService: {
        async getOperationsOverview(args) {
          if (input.getOperationsOverview) {
            return input.getOperationsOverview(args);
          }
          return {
            fromAddress: "noreply@example.com",
            generatedAt: args.now.toISOString(),
            mode: "live_send",
            providerConfigured: true,
            recentAttempts: [
              {
                createdAt: args.now.toISOString(),
                failureReason: null,
                messageType: "supplier_invite",
                provider: "resend",
                providerMessageId: "msg_123",
                recipientEmail: "supplier@example.com",
                status: "sent",
                statusRecordedAt: args.now.toISOString(),
                subject: "Supplier invite",
              },
            ],
            replyToAddress: "accounts@example.com",
            supportEmail: "accounts@example.com",
          };
        },
        async getRecipientState(args) {
          if (input.getRecipientState) {
            return input.getRecipientState(args);
          }
          return {
            canSend: true,
            occurredAt: null,
            recipientEmail: args.recipientEmail,
            status: null,
            statusReason: null,
            summary:
              "No blocked provider lifecycle state is recorded for this recipient.",
          };
        },
        async sendTestEmail(args) {
          if (input.sendTestEmail) {
            return input.sendTestEmail(args);
          }
        },
      },
    },
  });
}

function bearerToken() {
  return `Bearer ${
    issueAccessToken({
      expiresInSeconds: 900,
      now: NOW,
      secret: "development-access-secret",
      userId: USER_ID,
      userSlug: "admin-user",
    }).token
  }`;
}
