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
          async getSupplierForPortalUser() {
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

  it("links an existing user account to a supplier contact portal", async () => {
    const state = {
      actor: null as null | { userId: string; userSlug: string },
      contactReference: "",
      payload: null as null | { userSlug: string },
      slug: "",
    };
    const server = createAuthorizedServer(
      {
        adminSuppliers: {
          adminSupplierQueryService: unavailableSupplierQueryService(),
          adminSupplierWriteService: {
            ...unavailableSupplierWriteService(),
            async linkContactPortal(slug, contactReference, actor, payload) {
              state.slug = slug;
              state.contactReference = contactReference;
              state.actor = actor;
              state.payload = payload;
              return supplierDetail({ contactUserSlug: payload.userSlug });
            },
          },
        },
      },
      "suppliers.manage",
    );

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "POST",
      payload: { userSlug: "supplier-user" },
      url: "/api/admin/suppliers/acme-distribution/contacts/11111111-1111-4111-8111-111111111111/portal-link",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().contacts[0]?.userSlug, "supplier-user");
    assert.deepEqual(state, {
      actor: { userId: "usr_123", userSlug: "admin-user" },
      contactReference: "11111111-1111-4111-8111-111111111111",
      payload: { userSlug: "supplier-user" },
      slug: "acme-distribution",
    });
  });

  it("links a supplier product", async () => {
    const state = {
      actor: null as null | { userId: string; userSlug: string },
      payload: null as null | { productSlug: string },
      slug: "",
    };
    const server = createAuthorizedServer(
      {
        adminSuppliers: {
          adminSupplierQueryService: unavailableSupplierQueryService(),
          adminSupplierWriteService: {
            ...unavailableSupplierWriteService(),
            async linkProduct(slug, actor, payload) {
              state.slug = slug;
              state.actor = actor;
              state.payload = payload;
              return supplierDetail({ contactUserSlug: "supplier-user" });
            },
          },
        },
      },
      "suppliers.manage",
    );

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "POST",
      payload: {
        isPreferred: true,
        leadTimeDays: 5,
        minimumOrderQuantity: 10,
        productSlug: "soap-bar",
      },
      url: "/api/admin/suppliers/acme-distribution/products",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().products[0]?.productSlug, "soap-bar");
    assert.deepEqual(state, {
      actor: { userId: "usr_123", userSlug: "admin-user" },
      payload: {
        isPreferred: true,
        leadTimeDays: 5,
        minimumOrderQuantity: 10,
        productSlug: "soap-bar",
      },
      slug: "acme-distribution",
    });
  });

  it("creates a supplier procurement order with the authenticated actor", async () => {
    const state = {
      actor: null as null | { userId: string; userSlug: string },
      payload: null as null | Record<string, unknown>,
      slug: "",
    };
    const server = createAuthorizedServer(
      {
        adminSuppliers: {
          adminSupplierQueryService: unavailableSupplierQueryService(),
          adminSupplierWriteService: {
            ...unavailableSupplierWriteService(),
            async createProcurementOrder(slug, actor, payload) {
              state.slug = slug;
              state.actor = actor;
              state.payload = payload;
              return supplierDetail({ contactUserSlug: "supplier-user" });
            },
          },
        },
      },
      "suppliers.manage",
    );

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "POST",
      payload: {
        destinationLocationSlug: "accra-central-store",
        lines: [{ requestedQuantity: 12, variantSlug: "soap-bar-fresh" }],
        notes: "Restock the retail shelf.",
      },
      url: "/api/admin/suppliers/acme-distribution/procurement-orders",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(state, {
      actor: { userId: "usr_123", userSlug: "admin-user" },
      payload: {
        destinationLocationSlug: "accra-central-store",
        lines: [{ requestedQuantity: 12, variantSlug: "soap-bar-fresh" }],
        notes: "Restock the retail shelf.",
      },
      slug: "acme-distribution",
    });
  });

  it("invites a supplier contact into the supplier portal", async () => {
    const state = {
      actor: null as null | { userId: string; userSlug: string },
      contactReference: "",
      slug: "",
    };
    const server = createAuthorizedServer(
      {
        adminSuppliers: {
          adminSupplierQueryService: unavailableSupplierQueryService(),
          adminSupplierWriteService: {
            ...unavailableSupplierWriteService(),
            async inviteContactPortal(slug, contactReference, actor) {
              state.slug = slug;
              state.contactReference = contactReference;
              state.actor = actor;
              return supplierDetail({ contactUserSlug: "ama-mensah" });
            },
          },
        },
      },
      "suppliers.manage",
    );

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "POST",
      url: "/api/admin/suppliers/acme-distribution/contacts/11111111-1111-4111-8111-111111111111/portal-invite",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().contacts[0]?.userSlug, "ama-mensah");
    assert.deepEqual(state, {
      actor: { userId: "usr_123", userSlug: "admin-user" },
      contactReference: "11111111-1111-4111-8111-111111111111",
      slug: "acme-distribution",
    });
  });

  it("unlinks a supplier contact portal user", async () => {
    const state = {
      actor: null as null | { userId: string; userSlug: string },
      contactReference: "",
      slug: "",
    };
    const server = createAuthorizedServer(
      {
        adminSuppliers: {
          adminSupplierQueryService: unavailableSupplierQueryService(),
          adminSupplierWriteService: {
            ...unavailableSupplierWriteService(),
            async unlinkContactPortal(slug, contactReference, actor) {
              state.slug = slug;
              state.contactReference = contactReference;
              state.actor = actor;
              return supplierDetail({ contactUserSlug: null });
            },
          },
        },
      },
      "suppliers.manage",
    );

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "DELETE",
      url: "/api/admin/suppliers/acme-distribution/contacts/11111111-1111-4111-8111-111111111111/portal-link",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().contacts[0]?.userSlug, null);
    assert.deepEqual(state, {
      actor: { userId: "usr_123", userSlug: "admin-user" },
      contactReference: "11111111-1111-4111-8111-111111111111",
      slug: "acme-distribution",
    });
  });

  it("unlinks a supplier product", async () => {
    const state = {
      actor: null as null | { userId: string; userSlug: string },
      productSlug: "",
      slug: "",
    };
    const server = createAuthorizedServer(
      {
        adminSuppliers: {
          adminSupplierQueryService: unavailableSupplierQueryService(),
          adminSupplierWriteService: {
            ...unavailableSupplierWriteService(),
            async unlinkProduct(slug, productSlug, actor) {
              state.slug = slug;
              state.productSlug = productSlug;
              state.actor = actor;
              return true;
            },
          },
        },
      },
      "suppliers.manage",
    );

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "DELETE",
      url: "/api/admin/suppliers/acme-distribution/products/soap-bar",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(state, {
      actor: { userId: "usr_123", userSlug: "admin-user" },
      productSlug: "soap-bar",
      slug: "acme-distribution",
    });
  });

  it("transitions a supplier procurement order with the authenticated actor", async () => {
    const state = {
      actor: null as null | { userId: string; userSlug: string },
      notes: null as null | string,
      reference: "",
      slug: "",
      status: "",
    };
    const server = createAuthorizedServer(
      {
        adminSuppliers: {
          adminSupplierQueryService: unavailableSupplierQueryService(),
          adminSupplierWriteService: {
            ...unavailableSupplierWriteService(),
            async transitionProcurementOrder(
              slug,
              reference,
              actor,
              status,
              notes,
            ) {
              state.slug = slug;
              state.reference = reference;
              state.actor = actor;
              state.status = status;
              state.notes = notes;
              return supplierDetail({ contactUserSlug: "supplier-user" });
            },
          },
        },
      },
      "suppliers.manage",
    );

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "POST",
      payload: { notes: "Ready to place with supplier." },
      url: "/api/admin/suppliers/acme-distribution/procurement-orders/PO-2026-0001/approve",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(state, {
      actor: { userId: "usr_123", userSlug: "admin-user" },
      notes: "Ready to place with supplier.",
      reference: "PO-2026-0001",
      slug: "acme-distribution",
      status: "approved",
    });
  });
});

describe("supplier portal routes", () => {
  it("loads the supplier profile for the authenticated linked supplier user", async () => {
    const state = { userId: "" };
    const server = createAuthorizedServer(
      {
        adminSuppliers: {
          adminSupplierQueryService: {
            ...unavailableSupplierQueryService(),
            async getSupplierForPortalUser(userId) {
              state.userId = userId;
              return supplierDetail({ contactUserSlug: "supplier-user" });
            },
          },
          adminSupplierWriteService: unavailableSupplierWriteService(),
        },
      },
      "supplier.dashboard.view",
    );

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "GET",
      url: "/api/supplier/profile",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().slug, "acme-distribution");
    assert.equal(state.userId, "usr_123");
  });

  it("denies the supplier portal when the user is not linked to an active supplier contact", async () => {
    const server = createAuthorizedServer(
      {
        adminSuppliers: {
          adminSupplierQueryService: {
            ...unavailableSupplierQueryService(),
            async getSupplierForPortalUser() {
              return null;
            },
          },
          adminSupplierWriteService: unavailableSupplierWriteService(),
        },
      },
      "supplier.dashboard.view",
    );

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "GET",
      url: "/api/supplier/profile",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().title, "Supplier account not linked");
  });
});

function createAuthorizedServer(
  options: Parameters<typeof createServer>[0] = {},
  expectedPermission = "suppliers.view",
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
          assert.equal(input.permission, expectedPermission);
        },
      },
    },
  });
}

function unavailableSupplierQueryService() {
  return {
    async getSupplier() {
      throw new Error("not used");
    },
    async getSupplierForPortalUser() {
      throw new Error("not used");
    },
    async listSuppliers() {
      throw new Error("not used");
    },
  };
}

function unavailableSupplierWriteService() {
  return {
    async addContact() {
      throw new Error("not used");
    },
    async createSupplier() {
      throw new Error("not used");
    },
    async createInquiry() {
      throw new Error("not used");
    },
    async createProcurementOrder() {
      throw new Error("not used");
    },
    async linkProduct() {
      throw new Error("not used");
    },
    async inviteContactPortal() {
      throw new Error("not used");
    },
    async linkContactPortal() {
      throw new Error("not used");
    },
    async receiveProcurementOrder() {
      throw new Error("not used");
    },
    async removeContact() {
      throw new Error("not used");
    },
    async transitionProcurementOrder() {
      throw new Error("not used");
    },
    async unlinkProduct() {
      throw new Error("not used");
    },
    async unlinkContactPortal() {
      throw new Error("not used");
    },
    async updateSupplier() {
      throw new Error("not used");
    },
    async updateInquiry() {
      throw new Error("not used");
    },
  };
}

function supplierDetail(input: { contactUserSlug: string | null }) {
  return {
    contactCount: 1,
    contacts: [
      {
        contactReference: "11111111-1111-4111-8111-111111111111",
        email: "ama@acme.example",
        firstName: "Ama",
        isPrimary: true,
        jobTitle: "Procurement lead",
        lastName: "Mensah",
        latestInvite: null,
        phone: "+233 555 0101",
        portalStatus: input.contactUserSlug
          ? ("linked" as const)
          : ("none" as const),
        status: "active" as const,
        userSlug: input.contactUserSlug,
      },
    ],
    createdAt: "2026-04-22T09:00:00.000Z",
    email: "procurement@acme.example",
    inquiries: [],
    legalName: "Acme Distribution Limited",
    linkedUserCount: input.contactUserSlug ? 1 : 0,
    name: "Acme Distribution",
    paymentTermsDays: 30,
    phone: "+233 555 0100",
    primaryContact: {
      email: "ama@acme.example",
      firstName: "Ama",
      lastName: "Mensah",
      phone: "+233 555 0101",
      userSlug: input.contactUserSlug,
    },
    primaryImageUrl: null,
    procurementOrders: [],
    products: [
      {
        brandName: "FreshGlow",
        categoryName: "Bath Care",
        isPreferred: true,
        lastCostPrice: null,
        leadTimeDays: 5,
        minimumOrderQuantity: 10,
        productName: "Soap Bar",
        productSlug: "soap-bar",
        supplierProductCode: null,
        variantCount: 2,
        variants: [],
      },
    ],
    recentTransactions: [],
    slug: "acme-distribution",
    status: "active" as const,
    taxId: "TIN-12345",
    website: "https://acme.example",
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
