import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import type { InvoiceRecord } from "../src/modules/sales/sales.contracts.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-04-29T12:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const LOCATION_ID = "22222222-2222-4222-8222-222222222222";

describe("manager dashboard routes", () => {
  it("returns a manager summary with correct inventory, sales, and transfer counts", async () => {
    const server = createManagerDashboardServer({
      canManageTransfers: true,
      canViewSales: true,
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      query: { locationId: LOCATION_ID },
      url: "/api/manager/dashboard/summary",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().skuCount, 3);
    assert.equal(response.json().lowStockCount, 2);
    assert.equal(response.json().sales.todaysRevenue, 150);
    assert.equal(response.json().sales.transactionCount, 2);
    assert.equal(response.json().sales.averageSaleValue, 75);
    assert.equal(response.json().sales.latestSales.length, 3);
    assert.equal(response.json().transfers.openTransferCount, 2);
    assert.equal(response.json().transfers.activeTransfers.length, 2);
  });

  it("omits sales and transfer detail when those permissions are not enabled", async () => {
    const server = createManagerDashboardServer({
      canManageTransfers: false,
      canViewSales: false,
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      query: { locationId: LOCATION_ID },
      url: "/api/manager/dashboard/summary",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().skuCount, 3);
    assert.equal(response.json().lowStockCount, 2);
    assert.equal(response.json().sales, null);
    assert.equal(response.json().transfers, null);
  });
});

function createManagerDashboardServer(input: {
  canManageTransfers: boolean;
  canViewSales: boolean;
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
                  id: USER_ID,
                  slug: "store-manager",
                  status: "active" as const,
                };
              },
            },
            "development-access-secret",
            () => NOW,
          ).authenticate(token);
        },
      },
      permissionService: createPermissionService(input),
    },
    managerDashboard: {
      invoiceRepository: {
        async listByLocation() {
          return {
            items: [
              invoiceRecord({
                createdAt: new Date("2026-04-29T10:00:00.000Z"),
                reference: "INV/2026/000101",
                totalAmount: "50.00",
                type: "adjusted",
              }),
              invoiceRecord({
                createdAt: new Date("2026-04-29T09:00:00.000Z"),
                reference: "INV/2026/000100",
                totalAmount: "120.00",
              }),
              invoiceRecord({
                createdAt: new Date("2026-04-29T08:00:00.000Z"),
                reference: "INV/2026/000099",
                totalAmount: "30.00",
              }),
            ],
            total: 3,
          };
        },
      },
      permissionService: createPermissionService(input),
      stockBalanceQueryRepo: {
        async listStockBalancesByLocationId() {
          return {
            items: [
              stockBalance({ availableQuantity: 4 }),
              stockBalance({
                availableQuantity: 0,
                skuId: "33333333-3333-4333-8333-333333333333",
                sku: "SKU-002",
              }),
              stockBalance({
                availableQuantity: 18,
                skuId: "44444444-4444-4444-8444-444444444444",
                sku: "SKU-003",
              }),
            ],
            locationName: "Downtown Store",
            totalCount: 3,
          };
        },
      },
      supplyRequestRepository: {
        async listByLocation() {
          return {
            items: [
              supplyRequest({ status: "pending" }),
              supplyRequest({
                id: "55555555-5555-4555-8555-555555555556",
                reference: "REQ-002",
                status: "approved",
              }),
              supplyRequest({
                id: "55555555-5555-4555-8555-555555555557",
                reference: "REQ-003",
                status: "received",
              }),
            ],
            total: 3,
          };
        },
      },
    },
  });
}

function createPermissionService(input: {
  canManageTransfers: boolean;
  canViewSales: boolean;
}) {
  return {
    async assertHasPermission(args: {
      locationId?: string;
      permission: string;
      user: { userId: string };
    }) {
      if (args.permission === "stock.view") {
        return;
      }

      if (args.permission === "pos.sales.view" && input.canViewSales) {
        return;
      }

      if (args.permission === "stock.supply.manage" && input.canManageTransfers) {
        return;
      }

      throw new AppError({
        code: "forbidden",
        detail: "Permission denied.",
        statusCode: 403,
        title: "Forbidden",
      });
    },
  };
}

function invoiceRecord(overrides: Partial<InvoiceRecord>): InvoiceRecord {
  return {
    attributedWorkerEmail: null,
    attributedWorkerId: null,
    attributedWorkerName: null,
    classification: "outgoing",
    confirmedAt: NOW,
    createdAt: NOW,
    createdBy: USER_ID,
    currencyCode: "GHS",
    currencyScale: 2,
    currentPayableReference: "INV/2026/000100",
    customerBillingAddressLines: null,
    customerEmail: null,
    customerName: null,
    customerPhone: null,
    customerTaxNumber: null,
    id: "66666666-6666-4666-8666-666666666666",
    locationId: LOCATION_ID,
    notes: null,
    parentInvoiceId: null,
    parentInvoiceReference: null,
    paymentMethod: "cash",
    reference: "INV/2026/000100",
    replacementInvoiceId: null,
    replacementInvoiceReference: null,
    revisionCreditNoteId: null,
    revisionCreditNoteReference: null,
    revisionRootInvoiceId: null,
    revisionRootReference: null,
    role: "standard",
    status: "confirmed",
    subtotalAmount: "120.00",
    taxAmount: "0.00",
    totalAmount: "120.00",
    type: "pos",
    updatedAt: NOW,
    voidedAt: null,
    voidReason: null,
    ...overrides,
  };
}

function stockBalance(
  overrides: Partial<{
    availableQuantity: number;
    sku: string;
    skuId: string;
  }>,
) {
  return {
    availableQuantity: 8,
    inTransitQuantity: 0,
    locationName: "Downtown Store",
    locationSlug: "downtown-store",
    onHandQuantity: 8,
    productName: "Uniform Shirt",
    productSlug: "uniform-shirt",
    reservedQuantity: 0,
    sku: "SKU-001",
    skuId: "33333333-3333-4333-8333-333333333332",
    updatedAt: NOW.toISOString(),
    variantName: "Blue / M",
    variantSlug: "blue-m",
    ...overrides,
  };
}

function supplyRequest(
  overrides: Partial<{
    id: string;
    reference: string;
    status: "approved" | "cancelled" | "dispatched" | "pending" | "received" | "rejected";
    transferReference: string | null;
  }>,
) {
  return {
    approvedQuantity: 2,
    createdAt: NOW,
    dispatchedAt: null as Date | null,
    dispatchedBy: null,
    gtnReference: null,
    id: "55555555-5555-4555-8555-555555555555",
    locationId: LOCATION_ID,
    locationName: "Downtown Store",
    notes: null,
    receivedAt: null as Date | null,
    reference: "REQ-001",
    requestGroupReference: null,
    requestedQuantity: 2,
    requesterEmail: "worker@example.com",
    requesterId: USER_ID,
    requesterName: "Worker A",
    resolutionNotes: null,
    resolvedAt: null as Date | null,
    resolvedBy: null,
    skuId: "77777777-7777-4777-8777-777777777777",
    skuSnapshot: {
      productName: "Uniform Shirt",
      sku: "SKU-001",
      variantName: "Blue / M",
    },
    sourceLocationId: "88888888-8888-4888-8888-888888888888",
    sourceLocationName: "Main Warehouse",
    sourceReservationStatus: null,
    status: "pending" as const,
    transferReference: null,
    ...overrides,
  };
}

function bearerToken() {
  return `Bearer ${
    issueAccessToken({
      expiresInSeconds: 900,
      now: NOW,
      secret: "development-access-secret",
      userId: USER_ID,
      userSlug: "store-manager",
    }).token
  }`;
}
