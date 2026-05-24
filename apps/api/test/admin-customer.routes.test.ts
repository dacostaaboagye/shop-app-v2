import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

describe("admin customer routes", () => {
  it("lists customer organizations through the CRM service", async () => {
    const state = { lastQuery: null as null | Record<string, unknown> };
    const server = createAuthorizedServer({
      adminCustomers: {
        adminCustomerQueryService: {
          async getCustomer() {
            return null;
          },
          async listCustomers(query) {
            state.lastQuery = query;
            return {
              items: [customerSummary()],
              totalCount: 1,
            };
          },
        },
        adminCustomerWriteService: unavailableCustomerWriteService(),
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
        type: "business",
      },
      url: "/api/admin/customers",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().items[0]?.reference, "CUS-00001");
    assert.deepEqual(state.lastQuery, {
      dir: "desc",
      page: 2,
      pageSize: 20,
      q: "acme",
      sort: "createdAt",
      status: "active",
      type: "business",
    });
  });

  it("creates a customer with the authenticated actor", async () => {
    const state = {
      actorId: "",
      payload: null as null | Record<string, unknown>,
    };
    const server = createAuthorizedServer(
      {
        adminCustomers: {
          adminCustomerQueryService: unavailableCustomerQueryService(),
          adminCustomerWriteService: {
            ...unavailableCustomerWriteService(),
            async createCustomer(actorId, payload) {
              state.actorId = actorId;
              state.payload = payload;
              return customerDetail();
            },
          },
        },
      },
      "customers.manage",
    );

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "POST",
      payload: {
        customerType: "business",
        displayName: "Acme Retail",
        paymentTermsDays: 14,
      },
      url: "/api/admin/customers",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().slug, "acme-retail");
    assert.deepEqual(state, {
      actorId: "usr_123",
      payload: {
        customerType: "business",
        displayName: "Acme Retail",
        paymentTermsDays: 14,
        status: "active",
      },
    });
  });

  it("adds contacts and addresses behind manage permission", async () => {
    const calls: string[] = [];
    const server = createAuthorizedServer(
      {
        adminCustomers: {
          adminCustomerQueryService: unavailableCustomerQueryService(),
          adminCustomerWriteService: {
            ...unavailableCustomerWriteService(),
            async addContact(slug, actorId, payload) {
              calls.push(`${slug}:${actorId}:${payload.name}`);
              return customerDetail();
            },
            async addAddress(slug, actorId, payload) {
              calls.push(`${slug}:${actorId}:${payload.label}`);
              return customerDetail();
            },
          },
        },
      },
      "customers.manage",
    );

    const contactResponse = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "POST",
      payload: { isPrimary: true, name: "Ama Mensah" },
      url: "/api/admin/customers/acme-retail/contacts",
    });
    const addressResponse = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "POST",
      payload: {
        addressLines: ["12 Market Street"],
        isDefaultBilling: true,
        label: "Head office",
        type: "billing",
      },
      url: "/api/admin/customers/acme-retail/addresses",
    });

    assert.equal(contactResponse.statusCode, 200);
    assert.equal(addressResponse.statusCode, 200);
    assert.deepEqual(calls, [
      "acme-retail:usr_123:Ama Mensah",
      "acme-retail:usr_123:Head office",
    ]);
  });

  it("links and revokes customer contact portal access behind manage permission", async () => {
    const calls: string[] = [];
    const server = createAuthorizedServer(
      {
        adminCustomers: {
          adminCustomerQueryService: unavailableCustomerQueryService(),
          adminCustomerWriteService: {
            ...unavailableCustomerWriteService(),
            async linkContactPortal(slug, contactReference, actorId, payload) {
              calls.push(
                `link:${slug}:${contactReference}:${actorId}:${payload.userSlug}`,
              );
              return customerDetail();
            },
            async unlinkContactPortal(slug, contactReference, actorId) {
              calls.push(`unlink:${slug}:${contactReference}:${actorId}`);
              return customerDetail();
            },
          },
        },
      },
      "customers.manage",
    );

    const linkResponse = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "POST",
      payload: { userSlug: "customer-user" },
      url: "/api/admin/customers/acme-retail/contacts/CTC-00001/portal-link",
    });
    const unlinkResponse = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "DELETE",
      url: "/api/admin/customers/acme-retail/contacts/CTC-00001/portal-link",
    });

    assert.equal(linkResponse.statusCode, 200);
    assert.equal(unlinkResponse.statusCode, 200);
    assert.deepEqual(calls, [
      "link:acme-retail:CTC-00001:usr_123:customer-user",
      "unlink:acme-retail:CTC-00001:usr_123",
    ]);
  });

  it("returns 503 when customer services are unavailable", async () => {
    const server = createAuthorizedServer();

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "GET",
      url: "/api/admin/customers",
    });

    assert.equal(response.statusCode, 503);
  });
});

function createAuthorizedServer(
  options: Parameters<typeof createServer>[0] = {},
  expectedPermission = "customers.view",
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
            () => new Date("2026-05-24T12:00:00.000Z"),
          ).authenticate(token);
        },
      },
      permissionService: {
        async assertHasPermission(input) {
          assert.equal(input.permission, expectedPermission);
        },
      },
    },
  });
}

function unavailableCustomerQueryService() {
  return {
    async getCustomer() {
      throw new Error("not used");
    },
    async listCustomers() {
      throw new Error("not used");
    },
  };
}

function unavailableCustomerWriteService() {
  return {
    async addAddress() {
      throw new Error("not used");
    },
    async addContact() {
      throw new Error("not used");
    },
    async createCustomer() {
      throw new Error("not used");
    },
    async linkContactPortal() {
      throw new Error("not used");
    },
    async unlinkContactPortal() {
      throw new Error("not used");
    },
    async updateCustomer() {
      throw new Error("not used");
    },
  };
}

function customerSummary() {
  return {
    addressCount: 1,
    contactCount: 1,
    createdAt: "2026-05-24T09:00:00.000Z",
    customerType: "business" as const,
    defaultCurrencyCode: "GHS",
    displayName: "Acme Retail",
    legalName: "Acme Retail Limited",
    paymentTermsDays: 14,
    primaryContact: {
      contactReference: "CTC-00001",
      email: "buyer@example.com",
      name: "Ama Mensah",
      phone: null,
    },
    reference: "CUS-00001",
    slug: "acme-retail",
    status: "active" as const,
    taxNumber: null,
  };
}

function customerDetail() {
  return {
    ...customerSummary(),
    addresses: [],
    contacts: [],
    creditLimitAmount: null,
    events: [],
    notes: null,
  };
}

function issueTestToken() {
  return issueAccessToken({
    expiresInSeconds: 900,
    now: new Date("2026-05-24T12:00:00.000Z"),
    secret: "development-access-secret",
    userId: "usr_123",
    userSlug: "admin-user",
  }).token;
}
