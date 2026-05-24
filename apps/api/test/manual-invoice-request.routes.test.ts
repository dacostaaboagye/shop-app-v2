import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { IssuedDocumentSnapshotResponse } from "@shop/contracts";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import type { ManualInvoiceRequestRouteDependencies } from "../src/modules/sales/manual-invoice-request.routes.js";
import type { ManualInvoiceRequestRecord } from "../src/modules/sales/manual-invoice-request.types.js";
import type { InvoiceWithLines } from "../src/modules/sales/sales.contracts.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-05-23T10:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const APPROVER_ID = "22222222-2222-4222-8222-222222222222";
const LOCATION_ID = "33333333-3333-4333-8333-333333333333";

describe("manual invoice request routes", () => {
  it("creates a manager request only for a permitted location", async () => {
    const permissionCalls: Array<{ locationId?: string; permission: string }> =
      [];
    let createdBy: string | null = null;
    const server = createManualInvoiceServer({
      permissionCalls,
      dependencies: {
        manualInvoiceRequestService: {
          async createRequest(input) {
            createdBy = input.createdBy;
            return request();
          },
        },
      },
    });

    const response = await server.inject({
      headers: { authorization: bearerToken(USER_ID) },
      method: "POST",
      payload: {
        customerName: "Adwoa Mensah",
        lines: [{ quantity: 1, skuId: LOCATION_ID, unitPrice: "10.00" }],
        locationId: LOCATION_ID,
        reason: "Exceptional customer invoice",
      },
      url: "/api/manager/invoices/manual-requests",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(createdBy, USER_ID);
    assert.ok(
      permissionCalls.some(
        (call) =>
          call.permission === "invoices.manual.request" &&
          call.locationId === LOCATION_ID,
      ),
    );
    assert.equal(response.json().reference, "MIR-00001");
  });

  it("lets managers search CRM customers before requesting a manual invoice", async () => {
    const permissionCalls: Array<{ locationId?: string; permission: string }> =
      [];
    let searchQuery: string | null = null;
    const server = createManualInvoiceServer({
      permissionCalls,
      dependencies: {
        customerLookupRepository: {
          async searchCustomers(input) {
            searchQuery = input.q;
            return [
              {
                billingAddressLines: ["12 Market Street"],
                contacts: [
                  {
                    contactReference: "CON-00001",
                    email: "billing@example.com",
                    name: "Adwoa Mensah",
                    phone: "+233200000000",
                    receivesInvoices: true,
                  },
                ],
                displayName: "Adwoa Trading",
                reference: "CUS-00001",
                slug: "adwoa-trading",
                taxNumber: "TIN-123",
              },
            ];
          },
        },
      },
    });

    const response = await server.inject({
      headers: { authorization: bearerToken(USER_ID) },
      method: "GET",
      url: "/api/manager/customers?q=adwoa&limit=5",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(searchQuery, "adwoa");
    assert.ok(
      permissionCalls.some(
        (call) => call.permission === "invoices.manual.request",
      ),
    );
    assert.equal(response.json().items[0].slug, "adwoa-trading");
    assert.equal(
      response.json().items[0].contacts[0].contactReference,
      "CON-00001",
    );
  });

  it("approves a request and issues the sales document snapshot", async () => {
    let snapshotReference: string | null = null;
    const server = createManualInvoiceServer({
      authenticatedUserId: APPROVER_ID,
      dependencies: {
        manualInvoiceRequestService: {
          async approveRequest() {
            return {
              invoice: invoice(),
              request: request({
                approvedInvoiceReference: "INV-MAN-00001",
                status: "approved",
              }),
            };
          },
          async getRequestOrThrow() {
            return request();
          },
        },
        salesDocumentSnapshotService: {
          async getOrIssueSnapshot(input) {
            snapshotReference = input.reference;
            return snapshot(input.reference);
          },
        },
      },
    });

    const response = await server.inject({
      headers: { authorization: bearerToken(APPROVER_ID) },
      method: "POST",
      payload: { note: "Approved" },
      url: "/api/admin/invoices/manual-requests/MIR-00001/approve",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(snapshotReference, "INV-MAN-00001");
    assert.equal(response.json().approvedInvoiceReference, "INV-MAN-00001");
  });
});

function createManualInvoiceServer(
  input: {
    authenticatedUserId?: string;
    dependencies?: {
      customerLookupRepository?: ManualInvoiceRequestRouteDependencies["customerLookupRepository"];
      manualInvoiceRequestRepository?: Partial<
        ManualInvoiceRequestRouteDependencies["manualInvoiceRequestRepository"]
      >;
      manualInvoiceRequestService?: Partial<
        ManualInvoiceRequestRouteDependencies["manualInvoiceRequestService"]
      >;
      salesDocumentSnapshotService?: ManualInvoiceRequestRouteDependencies["salesDocumentSnapshotService"];
    };
    permissionCalls?: Array<{ locationId?: string; permission: string }>;
  } = {},
) {
  const permissionCalls = input.permissionCalls ?? [];
  const permissionService = {
    async assertHasPermission(args: {
      locationId?: string;
      permission: string;
    }) {
      permissionCalls.push({
        ...(args.locationId ? { locationId: args.locationId } : {}),
        permission: args.permission,
      });
    },
    async resolveAllPermissions() {
      return {
        anyActivePermissions: [
          { key: "invoices.manual.request", source: "role" as const },
          { key: "invoices.manual.view", source: "role" as const },
          { key: "invoices.manual.approve", source: "role" as const },
        ],
        locationScopes: [
          {
            locationId: LOCATION_ID,
            locationName: "East Legon",
            locationSlug: "east-legon",
            permissions: [
              { key: "invoices.manual.request", source: "role" as const },
              { key: "invoices.manual.view", source: "role" as const },
              { key: "invoices.manual.approve", source: "role" as const },
            ],
          },
        ],
      };
    },
  };

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
                  id: input.authenticatedUserId ?? USER_ID,
                  slug: "test-user",
                  status: "active" as const,
                };
              },
            },
            "development-access-secret",
            () => NOW,
          ).authenticate(token);
        },
      },
      permissionService,
    },
    manualInvoiceRequests: {
      ...(input.dependencies?.customerLookupRepository
        ? {
            customerLookupRepository:
              input.dependencies.customerLookupRepository,
          }
        : {}),
      manualInvoiceRequestRepository: {
        async findByReference() {
          return request();
        },
        async listByLocations() {
          return { items: [request()], total: 1 };
        },
        ...input.dependencies?.manualInvoiceRequestRepository,
      },
      manualInvoiceRequestService: {
        async approveRequest() {
          return { invoice: invoice(), request: request() };
        },
        async createRequest() {
          return request();
        },
        async getRequestOrThrow() {
          return request();
        },
        async rejectRequest() {
          return request({ status: "rejected" });
        },
        ...input.dependencies?.manualInvoiceRequestService,
      },
      permissionService,
      ...(input.dependencies?.salesDocumentSnapshotService
        ? {
            salesDocumentSnapshotService:
              input.dependencies.salesDocumentSnapshotService,
          }
        : {}),
    },
  });
}

function bearerToken(userId: string) {
  return `Bearer ${
    issueAccessToken({
      expiresInSeconds: 900,
      now: NOW,
      secret: "development-access-secret",
      userId,
      userSlug: "test-user",
    }).token
  }`;
}

function request(
  overrides: Partial<ManualInvoiceRequestRecord> = {},
): ManualInvoiceRequestRecord {
  return {
    approvedAt: null,
    approvedBy: null,
    approvedByName: null,
    approvedInvoiceId: null,
    approvedInvoiceReference: null,
    createdAt: NOW,
    currencyCode: "GHS",
    currencyScale: 2,
    customerBillingAddressLines: null,
    customerEmail: null,
    customerName: "Adwoa Mensah",
    customerPhone: null,
    customerTaxNumber: null,
    id: "request-1",
    lines: [],
    locationId: LOCATION_ID,
    locationName: "East Legon",
    paymentMethod: null,
    reason: "Exceptional customer invoice",
    reference: "MIR-00001",
    rejectedAt: null,
    rejectedBy: null,
    rejectedByName: null,
    rejectionReason: null,
    requestedBy: USER_ID,
    requestedByName: "Requester",
    status: "pending",
    subtotalAmount: "10.00",
    supportingNote: null,
    taxAmount: "0.00",
    totalAmount: "10.00",
    updatedAt: NOW,
    ...overrides,
  };
}

function invoice(): InvoiceWithLines {
  return {
    ...request(),
    attributedWorkerEmail: null,
    attributedWorkerId: null,
    attributedWorkerName: null,
    classification: "outgoing",
    confirmedAt: NOW,
    createdBy: APPROVER_ID,
    currentPayableReference: "INV-MAN-00001",
    id: "invoice-1",
    lines: [],
    locationId: LOCATION_ID,
    notes: null,
    parentInvoiceId: null,
    parentInvoiceReference: null,
    paymentMethod: null,
    reference: "INV-MAN-00001",
    replacementInvoiceId: null,
    replacementInvoiceReference: null,
    revisionCreditNoteId: null,
    revisionCreditNoteReference: null,
    revisionRootInvoiceId: null,
    revisionRootReference: null,
    role: "standard",
    status: "confirmed",
    type: "manual",
    voidedAt: null,
    voidReason: null,
  };
}

function snapshot(reference: string): IssuedDocumentSnapshotResponse {
  return {
    contentHash: "sha256:test",
    documentReference: reference,
    documentType: "sales_invoice",
    issuedAt: NOW.toISOString(),
    locationId: LOCATION_ID,
    payloadSnapshot: {},
    profileSnapshot: {
      accentColor: "hsl(28 72% 48%)",
      addressLines: ["Primary business location"],
      brandName: "Shop App",
      currencyCode: "GHS",
      currencyScale: 2,
      documentPrefix: "INV",
      email: "accounts@example.com",
      footer: "Official document.",
      legalName: "Shop App Trading Company",
      locale: "en-GH",
      locationId: LOCATION_ID,
      locationName: "East Legon",
      logoImageUrl: null,
      logoText: "SA",
      paperSize: "a4",
      phone: "+233 00 000 0000",
      primaryColor: "hsl(174 52% 23%)",
      registrationNumber: "REGISTRATION-PENDING",
      taxNumber: "TAX-PENDING",
      timezone: "Africa/Accra",
      website: "www.example.com",
    },
    resourceKind: "invoice",
    resourceReference: reference,
    schemaVersion: "official-document-v1",
  };
}
