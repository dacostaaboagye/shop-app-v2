import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-04-26T18:00:00.000Z");

describe("admin supplier portal invite route", () => {
  it("preserves the blocked-delivery contract for supplier portal invites", async () => {
    const server = createAuthorizedServer({
      adminSuppliers: {
        adminSupplierQueryService: unavailableSupplierQueryService(),
        adminSupplierWriteService: {
          ...unavailableSupplierWriteService(),
          async inviteContactPortal() {
            throw new AppError({
              code: "conflict",
              detail:
                "ama@acme.example cannot receive email right now because the provider has suppressed the address.",
              details: {
                occurredAt: "2026-04-24T00:00:00.000Z",
                recipientEmail: "ama@acme.example",
                status: "suppressed",
              },
              statusCode: 409,
              title: "Email delivery blocked",
            });
          },
        },
      },
    });

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "POST",
      url: "/api/admin/suppliers/acme-distribution/contacts/11111111-1111-4111-8111-111111111111/portal-invite",
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().title, "Email delivery blocked");
    assert.equal(response.json().code, "conflict");
    assert.equal(response.json().details?.status, "suppressed");
  });

  it("limits repeated supplier portal invite sends before the service is called again", async () => {
    let inviteCount = 0;
    const server = createAuthorizedServer({
      adminSuppliers: {
        adminSupplierQueryService: unavailableSupplierQueryService(),
        adminSupplierWriteService: {
          ...unavailableSupplierWriteService(),
          async inviteContactPortal() {
            inviteCount += 1;
            return supplierDetail();
          },
        },
      },
    });

    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        server.inject({
          headers: { authorization: `Bearer ${issueTestToken()}` },
          method: "POST",
          url: "/api/admin/suppliers/acme-distribution/contacts/11111111-1111-4111-8111-111111111111/portal-invite",
        }),
      ),
    );

    const limitedResponse = responses.at(-1);
    assert.ok(limitedResponse);
    assert.equal(limitedResponse.statusCode, 429);
    assert.equal(limitedResponse.json().code, "rate_limited");
    assert.equal(inviteCount, 5);
  });
});

function createAuthorizedServer(options: Parameters<typeof createServer>[0]) {
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
          assert.equal(input.permission, "suppliers.manage");
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
    async inviteContactPortal() {
      throw new Error("not used");
    },
    async linkContactPortal() {
      throw new Error("not used");
    },
    async linkProduct() {
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
    async unlinkContactPortal() {
      throw new Error("not used");
    },
    async unlinkProduct() {
      throw new Error("not used");
    },
    async updateInquiry() {
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
    now: NOW,
    secret: "development-access-secret",
    userId: "usr_123",
    userSlug: "admin-user",
  }).token;
}

function supplierDetail() {
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
        latestInvite: {
          attemptedAt: NOW.toISOString(),
          deliveryReason: null,
          deliveryStatus: "sent" as const,
          expiresAt: "2026-05-05T10:00:00.000Z",
          recipientEmail: "ama@acme.example",
        },
        phone: null,
        portalStatus: "invited" as const,
        status: "active" as const,
        userSlug: null,
      },
    ],
    createdAt: NOW.toISOString(),
    email: "supplier@example.com",
    inquiries: [],
    legalName: "Acme Distribution Limited",
    linkedUserCount: 0,
    name: "Acme Distribution",
    paymentTermsDays: 30,
    phone: "+233000000000",
    primaryContact: {
      email: "ama@acme.example",
      firstName: "Ama",
      lastName: "Mensah",
      phone: null,
      userSlug: null,
    },
    primaryImageUrl: null,
    procurementOrders: [],
    products: [],
    recentTransactions: [],
    slug: "acme-distribution",
    status: "active" as const,
    taxId: null,
    website: null,
  };
}
