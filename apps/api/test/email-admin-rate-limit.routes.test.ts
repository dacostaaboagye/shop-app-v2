import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { AccessTokenAuthenticationService } from "../src/modules/auth/access-token-authentication.service.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-05-05T09:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";

type SendTestEmailInput = { targetEmail: string };

type SendAdminCommunicationInput = {
  actorUserSlug: string;
  messageBody: string;
  now: Date;
  sendEmail: boolean;
  sendNotification: boolean;
  subject: string;
  target:
    | {
        audience: { locationId?: string; permission: string };
        kind: "audience";
      }
    | {
        kind: "user";
        recipient: { userSlug: string };
      };
};

type SendAdminCommunicationResult = {
  emailRecipientCount: number;
  notificationRecipientCount: number;
  ok: true;
  totalRecipientCount: number;
};

describe("email admin route rate limits", () => {
  it("limits test email sends before the provider is called again", async () => {
    const targetEmails: string[] = [];
    const server = createEmailAdminServer({
      async sendTestEmail(input: SendTestEmailInput) {
        targetEmails.push(input.targetEmail);
      },
    });

    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        server.inject({
          headers: { authorization: bearerToken() },
          method: "POST",
          payload: { targetEmail: "ops@example.com" },
          url: "/api/admin/settings/email/test-send",
        }),
      ),
    );

    const limitedResponse = responses.at(-1);
    assert.ok(limitedResponse);
    assert.equal(limitedResponse.statusCode, 429);
    assert.equal(limitedResponse.json().code, "rate_limited");
    assert.equal(targetEmails.length, 5);
  });

  it("limits admin communication sends before dispatching more messages", async () => {
    let sendCount = 0;
    const server = createEmailAdminServer({
      async sendAdminCommunication() {
        sendCount += 1;
        return {
          emailRecipientCount: 1,
          notificationRecipientCount: 1,
          ok: true as const,
          totalRecipientCount: 1,
        };
      },
    });

    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        server.inject({
          headers: { authorization: bearerToken() },
          method: "POST",
          payload: {
            messageBody: "Store A will close stock counts at 18:00 UTC.",
            sendEmail: true,
            sendNotification: true,
            subject: "Store A stock count notice",
            target: {
              kind: "user",
              recipient: { userSlug: "worker-a" },
            },
          },
          url: "/api/admin/notifications/compose",
        }),
      ),
    );

    const limitedResponse = responses.at(-1);
    assert.ok(limitedResponse);
    assert.equal(limitedResponse.statusCode, 429);
    assert.equal(limitedResponse.json().code, "rate_limited");
    assert.equal(sendCount, 5);
  });
});

function createEmailAdminServer(input: {
  sendAdminCommunication?: (
    input: SendAdminCommunicationInput,
  ) => Promise<SendAdminCommunicationResult>;
  sendTestEmail?: (input: SendTestEmailInput) => Promise<void>;
}) {
  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate(token) {
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
      adminCommunicationQueryService: {
        async listSent() {
          return { items: [], page: 1, pageSize: 10, totalCount: 0 };
        },
      },
      adminCommunicationService: {
        async send(args) {
          if (input.sendAdminCommunication) {
            return input.sendAdminCommunication(args);
          }

          return {
            emailRecipientCount: 0,
            notificationRecipientCount: 0,
            ok: true as const,
            totalRecipientCount: 0,
          };
        },
      },
      operationsService: {
        async getHealth(args) {
          return {
            deliveryRate: null,
            generatedAt: args.now.toISOString(),
            providerConfigured: true,
            totalAttempts: 0,
            totalBounced: 0,
            totalComplained: 0,
            totalDelivered: 0,
            totalFailed: 0,
            totalSent: 0,
            totalSuppressed: 0,
            windowDays: args.windowDays ?? 30,
          };
        },
        async getOperationsOverview(args) {
          return {
            fromAddress: "noreply@example.com",
            generatedAt: args.now.toISOString(),
            mode: "live_send" as const,
            providerConfigured: true,
            recentAttempts: [],
            replyToAddress: "accounts@example.com",
            supportEmail: "accounts@example.com",
          };
        },
        async getRecipientState(args) {
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
