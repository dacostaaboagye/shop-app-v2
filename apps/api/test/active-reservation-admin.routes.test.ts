import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

describe("active reservation admin routes", () => {
  it("lists active reservations for an authorized inventory reader", async () => {
    const state = {
      lastQuery: null as null | Record<string, unknown>,
    };
    const now = new Date("2026-04-08T12:00:00.000Z");
    const server = createServer({
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
                    slug: "store-manager",
                    status: "active",
                  };
                },
              },
              "development-access-secret",
              () => now,
            ).authenticate(token);
          },
        },
        permissionService: {
          async assertHasPermission() {},
        },
      },
      stock: {
        activeReservationQueryService: {
          async listActiveReservations(query) {
            state.lastQuery = query;
            return [
              {
                createdAt: new Date("2026-04-08T09:00:00.000Z"),
                expiresAt: new Date("2026-04-08T10:00:00.000Z"),
                locationId: "11111111-1111-4111-8111-111111111111",
                quantity: 3,
                skuId: "22222222-2222-4222-8222-222222222222",
                sourceKey: "order_123",
                sourceType: "ecommerce",
                status: "active" as const,
                updatedAt: new Date("2026-04-08T09:05:00.000Z"),
              },
            ];
          },
        },
      },
    });

    const response = await server.inject({
      headers: {
        authorization: `Bearer ${
          issueAccessToken({
            expiresInSeconds: 900,
            now,
            secret: "development-access-secret",
            userId: "usr_123",
            userSlug: "store-manager",
          }).token
        }`,
      },
      method: "GET",
      query: {
        expiresBefore: "2026-04-08T12:30:00.000Z",
        limit: "25",
        locationId: "11111111-1111-4111-8111-111111111111",
        skuId: "22222222-2222-4222-8222-222222222222",
      },
      url: "/api/admin/stock/reservations/active",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      items: [
        {
          createdAt: "2026-04-08T09:00:00.000Z",
          expiresAt: "2026-04-08T10:00:00.000Z",
          locationId: "11111111-1111-4111-8111-111111111111",
          quantity: 3,
          skuId: "22222222-2222-4222-8222-222222222222",
          sourceKey: "order_123",
          sourceType: "ecommerce",
          status: "active",
          updatedAt: "2026-04-08T09:05:00.000Z",
        },
      ],
    });
    assert.deepEqual(state.lastQuery, {
      expiresBefore: new Date("2026-04-08T12:30:00.000Z"),
      limit: 25,
      locationId: "11111111-1111-4111-8111-111111111111",
      skuId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("returns 503 when stock services are not configured", async () => {
    const now = new Date("2026-04-08T12:00:00.000Z");
    const server = createServer({
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
                    slug: "store-manager",
                    status: "active",
                  };
                },
              },
              "development-access-secret",
              () => now,
            ).authenticate(token);
          },
        },
        permissionService: {
          async assertHasPermission() {},
        },
      },
    });

    const response = await server.inject({
      headers: {
        authorization: `Bearer ${
          issueAccessToken({
            expiresInSeconds: 900,
            now,
            secret: "development-access-secret",
            userId: "usr_123",
            userSlug: "store-manager",
          }).token
        }`,
      },
      method: "GET",
      query: {
        locationId: "11111111-1111-4111-8111-111111111111",
      },
      url: "/api/admin/stock/reservations/active",
    });

    assert.equal(response.statusCode, 503);
    assert.equal(response.json().title, "Stock unavailable");
  });
});
