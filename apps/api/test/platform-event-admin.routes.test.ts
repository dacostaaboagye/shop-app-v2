import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-04-20T00:00:00.000Z");

describe("platform event admin routes", () => {
  it("returns delivery health for an authorized admin", async () => {
    const server = createPlatformEventAdminServer({
      permissionResult: "allowed",
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: "/api/admin/platform-events/delivery-health",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      deliveredCount: 5,
      failedCount: 1,
      generatedAt: "2026-04-20T00:00:00.000Z",
      oldestFailedAt: null,
      oldestPendingAt: "2026-04-19T23:00:00.000Z",
      pendingCount: 2,
      processingCount: 1,
      statusCounts: [
        { count: 2, status: "pending" },
        { count: 1, status: "processing" },
        { count: 5, status: "delivered" },
        { count: 1, status: "failed" },
      ],
      stuckProcessingCount: 1,
    });
  });

  it("requires admin dashboard permission", async () => {
    const server = createPlatformEventAdminServer({
      permissionResult: "forbidden",
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: "/api/admin/platform-events/delivery-health",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().title, "Forbidden");
  });
});

function createPlatformEventAdminServer(input: {
  permissionResult: "allowed" | "forbidden";
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
                  id: "11111111-1111-4111-8111-111111111111",
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
        async assertHasPermission(inputArgs) {
          assert.equal(inputArgs.permission, "admin.dashboard.view");
          assert.equal(inputArgs.scope, "any_active");

          if (input.permissionResult === "forbidden") {
            throw new AppError({
              code: "forbidden",
              detail: "You do not have permission to access this route.",
              statusCode: 403,
              title: "Forbidden",
            });
          }
        },
      },
    },
    eventsAdmin: {
      deliveryHealthService: {
        async getHealth() {
          return {
            deliveredCount: 5,
            failedCount: 1,
            generatedAt: "2026-04-20T00:00:00.000Z",
            oldestFailedAt: null,
            oldestPendingAt: "2026-04-19T23:00:00.000Z",
            pendingCount: 2,
            processingCount: 1,
            statusCounts: [
              { count: 2, status: "pending" as const },
              { count: 1, status: "processing" as const },
              { count: 5, status: "delivered" as const },
              { count: 1, status: "failed" as const },
            ],
            stuckProcessingCount: 1,
          };
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
      userId: "11111111-1111-4111-8111-111111111111",
      userSlug: "admin-user",
    }).token
  }`;
}
