import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

describe("admin supplier routes", () => {
  it("lists supplier organizations through the supplier domain service", async () => {
    const state = { lastQuery: null as null | Record<string, unknown> };
    const server = createAuthorizedServer({
      adminSuppliers: {
        adminSupplierQueryService: {
          async getSupplier() {
            return null;
          },
          async listSuppliers(query) {
            state.lastQuery = query;
            return {
              items: [
                {
                  contactCount: 2,
                  createdAt: "2026-04-22T09:00:00.000Z",
                  email: "procurement@acme.example",
                  legalName: "Acme Distribution Limited",
                  linkedUserCount: 1,
                  name: "Acme Distribution",
                  paymentTermsDays: 30,
                  phone: "+233 555 0100",
                  primaryContact: {
                    email: "ama@acme.example",
                    firstName: "Ama",
                    lastName: "Mensah",
                    phone: "+233 555 0101",
                    userSlug: "ama-mensah",
                  },
                  primaryImageUrl: null,
                  slug: "acme-distribution",
                  status: "active" as const,
                  taxId: "TIN-12345",
                  website: "https://acme.example",
                },
              ],
              totalCount: 1,
            };
          },
        },
        adminSupplierWriteService: unavailableSupplierWriteService(),
      },
    });

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "GET",
      query: {
        dir: "desc",
        page: "2",
        pageSize: "20",
        q: "acme",
        sort: "createdAt",
        status: "active",
      },
      url: "/api/admin/suppliers",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().items[0]?.name, "Acme Distribution");
    assert.equal(
      response.json().items[0]?.primaryContact?.userSlug,
      "ama-mensah",
    );
    assert.deepEqual(state.lastQuery, {
      dir: "desc",
      page: 2,
      pageSize: 20,
      q: "acme",
      sort: "createdAt",
      status: "active",
    });
  });

  it("returns 503 when supplier services are unavailable", async () => {
    const server = createAuthorizedServer();

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "GET",
      url: "/api/admin/suppliers",
    });

    assert.equal(response.statusCode, 503);
  });
});

function createAuthorizedServer(
  options: Parameters<typeof createServer>[0] = {},
) {
  return createServer({
    ...options,
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
                  slug: "admin-user",
                  status: "active",
                };
              },
            },
            "development-access-secret",
            () => new Date("2026-04-22T12:00:00.000Z"),
          ).authenticate(token);
        },
      },
      permissionService: {
        async assertHasPermission(input) {
          assert.equal(input.permission, "suppliers.view");
        },
      },
    },
  });
}

function unavailableSupplierWriteService() {
  return {
    async addContact() {
      throw new Error("not used");
    },
    async createSupplier() {
      throw new Error("not used");
    },
    async createProcurementOrder() {
      throw new Error("not used");
    },
    async linkProduct() {
      throw new Error("not used");
    },
    async receiveProcurementOrder() {
      throw new Error("not used");
    },
    async transitionProcurementOrder() {
      throw new Error("not used");
    },
    async unlinkProduct() {
      throw new Error("not used");
    },
    async updateSupplier() {
      throw new Error("not used");
    },
  };
}

function issueTestToken() {
  return issueAccessToken({
    expiresInSeconds: 900,
    now: new Date("2026-04-22T12:00:00.000Z"),
    secret: "development-access-secret",
    userId: "usr_123",
    userSlug: "admin-user",
  }).token;
}
