import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createUnavailableAuthDependencies } from "../src/modules/auth/auth-route-support.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-04-26T16:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("auth recovery routes", () => {
  it("returns 200 for forgot-password and delegates to the reset service", async () => {
    const calls: string[] = [];
    const server = createServer({
      auth: {
        ...createUnavailableAuthDependencies(),
        passwordResetService: {
          async initiateReset(email) {
            calls.push(email);
          },
          async resetPassword() {
            throw unavailableCallError();
          },
        },
      },
    });

    const response = await server.inject({
      method: "POST",
      payload: { email: "worker@example.com" },
      url: "/api/auth/forgot-password",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
    assert.deepEqual(calls, ["worker@example.com"]);
  });

  it("returns 204 for resend-verification and uses the authenticated user", async () => {
    const calls: string[] = [];
    const server = createRecoveryServer({
      auth: {
        ...createUnavailableAuthDependencies(),
        emailVerificationService: {
          async resend(userId) {
            calls.push(userId);
          },
          async verify() {
            throw unavailableCallError();
          },
        },
      },
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "POST",
      url: "/api/auth/resend-verification",
    });

    assert.equal(response.statusCode, 204);
    assert.deepEqual(calls, [USER_ID]);
  });

  it("preserves structured resend conflicts for authenticated recovery flows", async () => {
    const server = createRecoveryServer({
      auth: {
        ...createUnavailableAuthDependencies(),
        emailVerificationService: {
          async resend() {
            throw new AppError({
              code: "conflict",
              detail:
                "worker@example.com cannot receive email right now because the provider has suppressed the address.",
              details: {
                occurredAt: "2026-04-24T00:00:00.000Z",
                recipientEmail: "worker@example.com",
                status: "suppressed",
              },
              statusCode: 409,
              title: "Email delivery blocked",
            });
          },
          async verify() {
            throw unavailableCallError();
          },
        },
      },
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "POST",
      url: "/api/auth/resend-verification",
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().title, "Email delivery blocked");
    assert.equal(response.json().code, "conflict");
  });
});

function createRecoveryServer(input: Parameters<typeof createServer>[0]) {
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
                  slug: "worker-user",
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
    ...input,
  });
}

function bearerToken() {
  return `Bearer ${
    issueAccessToken({
      expiresInSeconds: 900,
      now: NOW,
      secret: "development-access-secret",
      userId: USER_ID,
      userSlug: "worker-user",
    }).token
  }`;
}

function unavailableCallError() {
  return new Error("This branch should not be called in this test.");
}
