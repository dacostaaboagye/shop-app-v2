import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

describe("active reservation admin routes", () => {
  it("lists active reservations for an authorized inventory reader", async () => {
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
        reservationQueryRepo: {
          async listReservations() {
            return {
              items: [
                {
                  createdAt: "2026-04-08T09:00:00.000Z",
                  expiresAt: "2026-04-08T10:00:00.000Z",
                  locationName: "Main Warehouse",
                  locationSlug: "main-warehouse",
                  productName: "Omaya Backpack",
                  productSlug: "omaya-backpack",
                  quantity: 3,
                  sku: "OMAYA-001-BRN",
                  skuId: "22222222-2222-4222-8222-222222222222",
                  sourceKey: "order_123",
                  sourceType: "ecommerce",
                  status: "active" as const,
                  updatedAt: "2026-04-08T09:05:00.000Z",
                  variantName: "Brown",
                  variantSlug: "omaya-backpack-brown",
                },
              ],
              locationName: "Main Warehouse",
            };
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
        limit: "25",
        locationSlug: "main-warehouse",
      },
      url: "/api/admin/stock/reservations/active",
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].sku, "OMAYA-001-BRN");
    assert.equal(body.locationName, "Main Warehouse");
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
      query: { locationSlug: "main-warehouse" },
      url: "/api/admin/stock/reservations/active",
    });

    assert.equal(response.statusCode, 503);
    assert.equal(response.json().title, "Stock unavailable");
  });
});
