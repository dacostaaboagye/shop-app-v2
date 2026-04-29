import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { internalApiDocsRateLimit } from "../src/modules/docs/internal-api-docs.routes.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-04-29T12:00:00.000Z");

describe("internal api docs routes", () => {
  it("returns the protected internal OpenAPI document", async () => {
    const server = createDocsServer(true);

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "GET",
      url: "/api/internal/docs/openapi.json",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().openapi, "3.0.3");
    assert.equal(response.json().info.title, "Shop API Internal Reference");
    assert.equal(response.headers["cache-control"], "private, max-age=300");
    assert.ok(response.json().paths["/api/worker/sales"]);
    assert.equal(
      response.json().paths["/api/notifications"].get.parameters[0].name,
      "limit",
    );
    assert.equal(
      response.json().paths["/api/worker/sales"].post.requestBody.content[
        "application/json"
      ].schema.$ref,
      "#/components/schemas/SalesPostApiWorkerSalesRequest",
    );
    assert.ok(
      response.json().components.schemas.SalesPostApiWorkerSalesResponse,
    );
    assert.equal(
      response.json().paths["/api/worker/sales"].post.responses["200"].content[
        "application/json"
      ].schema.$ref,
      "#/components/schemas/SalesPostApiWorkerSalesResponse",
    );
    assert.equal(
      response.json().paths["/api/internal/docs/openapi.json"].get[
        "x-route-access"
      ].permission,
      "api.docs.view",
    );
  });

  it("still allows authenticated access in development without the docs permission", async () => {
    const server = createDocsServer(false);

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "GET",
      url: "/api/internal/docs/openapi.json",
    });

    assert.equal(response.statusCode, 200);
  });

  it("declares a dedicated rate limit for the spec route", () => {
    assert.deepEqual(internalApiDocsRateLimit, {
      max: 20,
      timeWindow: "1 minute",
    });
  });
});

function createDocsServer(canViewDocs: boolean) {
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
                  id: "usr_123",
                  slug: "platform-admin",
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
        async assertHasPermission(input) {
          if (input.permission === "api.docs.view" && canViewDocs) {
            return;
          }

          throw new AppError({
            code: "forbidden",
            detail: "Permission denied.",
            statusCode: 403,
            title: "Forbidden",
          });
        },
      },
    },
  });
}

function issueTestToken() {
  return issueAccessToken({
    expiresInSeconds: 900,
    now: NOW,
    secret: "development-access-secret",
    userId: "usr_123",
    userSlug: "platform-admin",
  }).token;
}
