import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-04-20T00:30:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("notification routes", () => {
  it("lists notifications for the authenticated user", async () => {
    const server = createNotificationServer();

    const response = await server.inject({
      headers: {
        authorization: bearerToken(USER_ID, "worker-a"),
      },
      method: "GET",
      query: { limit: "8" },
      url: "/api/notifications",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().unreadCount, 2);
    assert.equal(response.json().items[0]?.resource.reference, "SUP-0001");
  });

  it("marks an owned notification as read", async () => {
    let seenKey = "";
    const server = createNotificationServer({
      markReadImpl: async ({ notificationKey }) => {
        seenKey = notificationKey;
        return {
          notificationKey,
          readAt: NOW.toISOString(),
          status: "read" as const,
        };
      },
    });

    const response = await server.inject({
      headers: {
        authorization: bearerToken(USER_ID, "worker-a"),
      },
      method: "PATCH",
      url: "/api/notifications/22222222-2222-4222-8222-222222222222/read",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(seenKey, "22222222-2222-4222-8222-222222222222");
    assert.equal(response.json().status, "read");
  });

  it("returns 404 when marking a missing notification", async () => {
    const server = createNotificationServer({
      markReadImpl: async () => {
        throw new AppError({
          code: "not_found",
          detail: "Notification missing.",
          statusCode: 404,
          title: "Notification not found",
        });
      },
    });

    const response = await server.inject({
      headers: {
        authorization: bearerToken(USER_ID, "worker-a"),
      },
      method: "PATCH",
      url: "/api/notifications/22222222-2222-4222-8222-222222222222/read",
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().title, "Notification not found");
  });

  it("marks all notifications as read", async () => {
    const server = createNotificationServer({
      markAllReadImpl: async () => ({ updatedCount: 3 }),
    });

    const response = await server.inject({
      headers: {
        authorization: bearerToken(USER_ID, "worker-a"),
      },
      method: "PATCH",
      url: "/api/notifications/read-all",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().updatedCount, 3);
  });
});

function createNotificationServer(input?: {
  markAllReadImpl?: (args: {
    now: Date;
    userId: string;
  }) => Promise<{ updatedCount: number }>;
  markReadImpl?: (args: {
    notificationKey: string;
    now: Date;
    userId: string;
  }) => Promise<{
    notificationKey: string;
    readAt: string | null;
    status: "read" | "unread";
  }>;
}) {
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
                  slug: "worker-a",
                  status: "active" as const,
                };
              },
            },
            "development-access-secret",
            () => NOW,
          ).authenticate(token);
        },
      },
    },
    notifications: {
      notificationQueryService: {
        async listNotifications() {
          return {
            items: [
              {
                actorUserSlug: "manager-a",
                eventType: "transfer.dispatched",
                notificationKey: "22222222-2222-4222-8222-222222222222",
                occurredAt: NOW.toISOString(),
                readAt: null,
                resource: {
                  kind: "stock_transfer_request",
                  reference: "SUP-0001",
                },
                status: "unread" as const,
                summary: "SUP-0001 was dispatched.",
              },
            ],
            unreadCount: 2,
          };
        },
      },
      notificationWriteService: {
        async markAllRead(args) {
          if (input?.markAllReadImpl) {
            return input.markAllReadImpl(args);
          }

          return { updatedCount: 1 };
        },
        async markRead(args) {
          if (input?.markReadImpl) {
            return input.markReadImpl(args);
          }

          return {
            notificationKey: args.notificationKey,
            readAt: NOW.toISOString(),
            status: "read" as const,
          };
        },
      },
    },
  });
}

function bearerToken(userId: string, userSlug: string) {
  return `Bearer ${
    issueAccessToken({
      expiresInSeconds: 900,
      now: NOW,
      secret: "development-access-secret",
      userId,
      userSlug,
    }).token
  }`;
}
